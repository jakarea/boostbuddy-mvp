"use server";

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getProfilesData() {
  try {
    const supabase = await createClient();

    // Fetch profiles and join with users to get the assigned client name
    const { data, error } = await supabase
      .from("profile_accounts")
      .select(`
        *,
        users (
          name,
          email
        ),
        services (
          id,
          name,
          price,
          duration_days
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch profiles:", error);
      return [];
    }

    // Transform the payload slightly to normalize the nested user info for the UI
    const profiles = (data || []).map((p: any) => ({
      ...p,
      client_name: p.users?.name || null,
      client_email: p.users?.email || null,
      service_name: p.services?.name || null,
      service_price: p.services?.price || null,
      service_duration: p.services?.duration_days || null,
    }));

    return profiles;
  } catch (error: any) {
    console.error("Failed to fetch profiles:", error);
    return [];
  }
}

export async function getActiveClientsData() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("role", "CLIENT")
      .eq("status", "ACTIVE")
      .order("name", { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error: any) {
    console.error("Failed to fetch active clients:", error);
    return [];
  }
}
