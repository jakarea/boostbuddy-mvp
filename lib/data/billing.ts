import { createClient } from "@/lib/supabase/server";

export async function getClientBillingData(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("billing_info")
      .select("*")
      .eq("user_id", userId)
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
