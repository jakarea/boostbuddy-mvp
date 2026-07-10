import { createClient } from "@/lib/supabase/server";

export async function getClientProfilesData(userId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profile_accounts")
      .select(`
        *,
        services (
          id,
          name,
          price,
          duration_days
        )
      `)
      .eq("assigned_client_id", userId)
      .neq("status", "AVAILABLE")
      .order("assignment_date", { ascending: false });

    if (error) {
      // Fallback query if relation doesn't exist yet
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profile_accounts")
        .select("*")
        .eq("assigned_client_id", userId)
        .neq("status", "AVAILABLE")
        .order("assignment_date", { ascending: false });

      if (fallbackError) throw fallbackError;
      return { success: true, data: fallbackData };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch client profiles" };
  }
}

export async function getAdminDashboardStatsData() {
  try {
    const supabase = await createClient();

    // Calculate date range for expiring profiles
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split("T")[0];
    const nextWeekStr = nextWeek.toISOString().split("T")[0];

    // Execute all 4 queries in parallel for better performance
    const [
      { data: pendingClients, error: pendingError },
      { count: activeClientsCount, error: activeError },
      { count: availableProfilesCount, error: availableError },
      { data: expiringProfiles, error: expiringError }
    ] = await Promise.all([
      // 1. Pending clients
      supabase
        .from("users")
        .select("id, name, email, created_at")
        .eq("role", "CLIENT")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false }),

      // 2. Active clients count
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "CLIENT")
        .eq("status", "ACTIVE"),

      // 3. Available profiles count
      supabase
        .from("profile_accounts")
        .select("id", { count: "exact", head: true })
        .eq("status", "AVAILABLE"),

      // 4. Expiring profiles
      supabase
        .from("profile_accounts")
        .select(`
          id,
          profile_name,
          expiration_date,
          assigned_client_id,
          users!profile_accounts_assigned_client_id_fkey ( name )
        `)
        .eq("status", "ACTIVE")
        .gte("expiration_date", todayStr)
        .lte("expiration_date", nextWeekStr)
        .order("expiration_date", { ascending: true })
    ]);

    if (pendingError) throw pendingError;
    if (activeError) throw activeError;
    if (availableError) throw availableError;
    if (expiringError) throw expiringError;

    return {
      success: true,
      data: {
        activeClientsCount: activeClientsCount || 0,
        pendingClientsCount: pendingClients?.length || 0,
        pendingClients: pendingClients || [],
        availableProfilesCount: availableProfilesCount || 0,
        expiringProfilesCount: expiringProfiles?.length || 0,
        expiringProfiles: expiringProfiles || [],
      }
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch dashboard statistics" };
  }
}
