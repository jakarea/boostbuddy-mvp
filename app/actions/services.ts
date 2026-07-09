"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/server-auth';
import { revalidatePath } from "next/cache";

export async function getServicesAction() {
  const auth = await requireAuth();
  if (!auth.success) throw new Error(auth.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch services:", error);
    throw new Error("Failed to fetch services");
  }

  return data;
}

export async function upsertServiceAction(formData: FormData, serviceId?: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const payload = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: parseFloat(formData.get("price") as string),
      duration_days: parseInt(formData.get("durationDays") as string, 10),
      is_active: formData.get("isActive") === "true",
      requires_manual_assignment: formData.get("requiresManualAssignment") === "true",
      instructions: formData.get("instructions") as string,
    };

    const supabaseAdmin = createAdminClient();
    let error;

    if (serviceId) {
      const { error: updateError } = await supabaseAdmin
        .from("services")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", serviceId);
      error = updateError;
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("services")
        .insert(payload);
      error = insertError;
    }

    if (error) {
      console.error("Failed to save service:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    revalidatePath("/admin/services");
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

    revalidatePath("/admin/services");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in deleteServiceAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}
