import { createClient } from "@/lib/supabase/server";

export async function getClientsData() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "CLIENT")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("Failed to fetch clients:", error);
    return [];
  }
}

export async function getProfileCountsData() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profile_accounts")
      .select("assigned_client_id")
      .not("assigned_client_id", "is", null);

    if (error) throw error;

    const counts: Record<string, number> = {};
    if (data) {
      data.forEach(p => {
        if (p.assigned_client_id) {
          counts[p.assigned_client_id] = (counts[p.assigned_client_id] || 0) + 1;
        }
      });
    }
    return counts;
  } catch (error: any) {
    console.error("Failed to fetch profile counts:", error);
    return {};
  }
}
