"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/server-auth';
import { revalidatePath } from "next/cache";

// --- PURE HELPER FUNCTIONS ---

const generateSafeFileName = (originalName: string): string => {
  const fileExt = originalName.split('.').pop() || 'pdf';
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
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
    return { success: false, error: error?.message || "Failed to fetch client invoices" };
  }
}

export async function uploadInvoiceAction(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();
    const safeFileName = generateSafeFileName(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("invoices")
      .upload(safeFileName, buffer, { contentType: file.type, upsert: false });

    if (uploadError) throw new Error("Failed to upload file to storage");

    const invoicePayload = extractInvoiceData(formData, uploadData.path, file.name, formatFileSize(file.size));
    const { error: dbError } = await supabaseAdmin.from("invoices").insert(invoicePayload);

    if (dbError) {
      await supabaseAdmin.storage.from("invoices").remove([uploadData.path]);
      throw new Error("Failed to save invoice record");
    }

    revalidatePath("/admin/invoices");
    revalidatePath("/dashboard/invoices");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Upload failed" };
  }
}

export async function deleteInvoiceAction(id: string, path: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();

    const { error: dbError } = await supabaseAdmin.from("invoices").delete().eq("id", id);
    if (dbError) throw new Error("Failed to delete from database");

    const { error: storageError } = await supabaseAdmin.storage.from("invoices").remove([path]);
    if (storageError) console.error("Storage delete failed, but DB record was removed:", storageError);

    revalidatePath("/admin/invoices");
    revalidatePath("/dashboard/invoices");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete invoice" };
  }
}

export async function getInvoiceDownloadUrlAction(path: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    // Use admin client to bypass storage RLS when generating signed URL
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.storage.from("invoices").createSignedUrl(path, 3600, { download: true });

    if (error || !data) throw new Error("Failed to generate download link");
    return { success: true, url: data.signedUrl };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to get download URL" };
  }
}
