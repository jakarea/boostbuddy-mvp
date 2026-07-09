"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from '@/lib/auth/server-auth';

export async function getClientBillingAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("billing_info")
      .select("*")
      .eq("user_id", auth.user.id)
      .single();

    // If no row exists, single() throws an error (PGRST116), which is expected if they haven't set it yet.
    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return { success: true, data: data || null };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch billing info" };
  }
}

export async function upsertClientBillingAction(payload: {
  billing_type: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  vat_number?: string;
  fiscal_code?: string;
  sdi_code?: string;
}) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();

    const { error } = await supabase
      .from("billing_info")
      .upsert({
        user_id: auth.user.id,
        ...payload,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id"
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update billing info" };
  }
}
