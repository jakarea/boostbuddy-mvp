import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getClientsData() {
  try {
    const supabase = await createClient();
    const { data: dbUsers, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "CLIENT")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!dbUsers || dbUsers.length === 0) return [];

    // Fetch auth user confirmation status
    try {
      const supabaseAdmin = createAdminClient();
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
      if (authData?.users) {
        const authMap = new Map(authData.users.map(u => [u.id, !!u.email_confirmed_at]));
        return dbUsers.map(u => ({
          ...u,
          email_verified: authMap.get(u.id) ?? false,
        }));
      }
    } catch (authErr) {
      console.error("Failed to list auth users for email confirmation:", authErr);
    }

    return dbUsers.map(u => ({ ...u, email_verified: false }));
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
