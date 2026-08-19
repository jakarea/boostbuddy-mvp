"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/server-auth';
import { revalidatePath } from "next/cache";
import { randomUUID } from 'crypto';

// --- PURE HELPER FUNCTIONS ---

const generateSafeFileName = (originalName: string): string => {
  const fileExt = originalName.split('.').pop() || 'pdf';
  return `${Date.now()}_${randomUUID()}.${fileExt}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes <= 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const extractInvoiceData = (formData: FormData, uploadPath: string, fileName: string, fileSize: string) => {
  return {
    user_id: formData.get("userId") as string,
    order_id: (formData.get("orderId") as string) || null,
    payment_period_start: (formData.get("periodStart") as string) || null,
    payment_period_end: (formData.get("periodEnd") as string) || null,
    pdf_path: uploadPath,
    file_name: fileName,
    file_size: fileSize,
  };
};

// --- CONTROLLER ACTIONS ---

export async function getAdminInvoicesAction() {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    // Production: Use Supabase
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoices")
      .select("*, users:user_id(name, email), orders:order_id(service_id)")
      .order("uploaded_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch invoices" };
  }
}

export async function getClientInvoicesAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoices")
      .select("*, orders:order_id(service_id)")
      .eq("user_id", auth.user.id)
      .order("uploaded_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch invoices" };
  }
}

export async function uploadInvoiceAction(formData: FormData) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    // Rate limiting for file upload operations
    const { checkRateLimit, getClientIp, RateLimitPresets } = await import("@/lib/rate-limit");
    const headersList = await headers();
    const clientIp = getClientIp(headersList);
    const rateLimit = checkRateLimit(`upload:invoice:${auth.user.id}:${clientIp}`, RateLimitPresets.UPLOAD);
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.error || "Too many upload attempts. Please try again later." };
    }

    const file = formData.get("file") as File;
    if (!file) {
      console.error("❌ [INVOICE UPLOAD] No file provided");
      return { success: false, error: "No file provided" };
    }

    console.log("📤 [INVOICE UPLOAD] Starting upload:", file.name, file.size, file.type);

    // Always use Supabase Storage for file uploads
    const supabaseAdmin = createAdminClient();
    const safeFileName = generateSafeFileName(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log("📤 [INVOICE UPLOAD] Uploading to Supabase Storage:", safeFileName);

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("invoices")
      .upload(safeFileName, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("❌ [INVOICE UPLOAD] Supabase Storage error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log("✅ [INVOICE UPLOAD] File uploaded successfully:", uploadData);

    // Production mode: Save to Supabase
    const invoicePayload = extractInvoiceData(formData, uploadData.path, file.name, formatFileSize(file.size));
    console.log("💾 [INVOICE UPLOAD] Saving to database:", invoicePayload);

    const { error: dbError } = await (supabaseAdmin
      .from("invoices") as any).insert(invoicePayload);

    if (dbError) {
      console.error("❌ [INVOICE UPLOAD] Database error:", dbError);
      await supabaseAdmin.storage.from("invoices").remove([uploadData.path]);
      throw new Error(`Failed to save invoice record: ${dbError.message}`);
    }

    console.log("✅ [INVOICE UPLOAD] Invoice saved successfully");

    revalidatePath("/a/invoices");
    revalidatePath("/c/invoices");
    return { success: true };
  } catch (error: any) {
    console.error("❌ [INVOICE UPLOAD] Upload failed:", error);
    return { success: false, error: error?.message || "Upload failed" };
  }
}

export async function deleteInvoiceAction(id: string, path: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();

    // Always delete from Supabase Storage (file cleanup)
    const { error: storageError } = await supabaseAdmin.storage
      .from("invoices")
      .remove([path]);

    if (storageError) {
      console.warn("Failed to delete file from storage:", storageError.message);
    }

    // Production mode: Delete from Supabase
    const { error: dbError } = await supabaseAdmin
      .from("invoices")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    revalidatePath("/a/invoices");
    revalidatePath("/c/invoices");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Delete failed" };
  }
}

export async function getInvoiceDownloadUrlAction(path: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (!path) {
      return { success: false, error: "No file path provided" };
    }

    // SECURITY: For non-admin users, verify the invoice belongs to them (IDOR protection)
    if (auth.user.role !== 'ADMIN') {
      const supabase = await createClient();
      const { data: owned } = await supabase
        .from("invoices")
        .select("id")
        .eq("user_id", auth.user.id)
        .eq("pdf_path", path)
        .limit(1);
      if (!owned || owned.length === 0) {
        return { success: false, error: "Invoice not found" };
      }
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.storage
      .from("invoices")
      .createSignedUrl(path, 60);

    if (error) throw error;

    return { success: true, data: { url: data.signedUrl } };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to get download URL" };
  }
}
