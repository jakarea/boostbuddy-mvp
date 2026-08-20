"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/server-auth';
import { revalidatePath } from "next/cache";

export async function getServicesAction() {
  const auth = await requireAuth();
  if (!auth.success) {
    console.warn("[getServicesAction] Auth failed:", auth.error);
    return { success: false, error: auth.error, data: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, price, duration_days, is_active, requires_manual_assignment, instructions")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch services:", error);
    return { success: false, error: "Failed to fetch services", data: [] };
  }

  return { success: true, data: data || [] };
}

export async function upsertServiceAction(formData: FormData, serviceId?: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    // Extract and validate form data
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const priceValue = formData.get("price") as string;
    const durationValue = formData.get("durationDays") as string;
    const instructions = formData.get("instructions") as string;

    // Validate required fields
    if (!name || !description || !priceValue || !durationValue) {
      return { success: false, error: "All required fields must be provided" };
    }

    // Validate and parse numeric values with proper error handling
    const price = parseFloat(priceValue);
    const duration_days = parseInt(durationValue, 10);

    // Check for NaN and validate ranges
    if (isNaN(price) || price <= 0) {
      return { success: false, error: "Price must be a positive number" };
    }

    if (isNaN(duration_days) || duration_days <= 0 || duration_days > 3650) {
      return { success: false, error: "Duration must be between 1 and 3650 days" };
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      price,
      duration_days,
      is_active: formData.get("isActive") === "true",
      requires_manual_assignment: formData.get("requiresManualAssignment") === "true",
      instructions: instructions?.trim() || "",
    };

    const supabaseAdmin = createAdminClient();
    let error;

    if (serviceId) {
      const { error: updateError } = await (supabaseAdmin as any)
        .from("services")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", serviceId);
      error = updateError;
    } else {
      const { error: insertError } = await (supabaseAdmin as any)
        .from("services")
        .insert(payload);
      error = insertError;
    }

    if (error) {
      console.error("Failed to save service:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    revalidatePath("/a/services");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in upsertServiceAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}

export async function deleteServiceAction(id: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("services")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete service:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    revalidatePath("/a/services");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in deleteServiceAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}
