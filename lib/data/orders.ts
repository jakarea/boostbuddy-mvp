"use server";

import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getAdminOrdersData() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        users (
          name,
          email
        ),
        services (
          name
        ),
        profile_accounts (
          profile_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error: any) {
    console.error("Failed to fetch orders:", error);
    return [];
  }
}

export async function getClientOrdersData(userId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        services (
          id,
          name,
          price,
          duration_days
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fallbackError) throw fallbackError;
      return { success: true, data: fallbackData };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch orders" };
  }
}
