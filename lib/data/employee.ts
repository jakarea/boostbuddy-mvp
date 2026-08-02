"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server-auth";

/**
 * Fetch all users with ADMIN or EMPLOYEE roles for employee management
 */
export async function getEmployeeUsersData() {
  try {
    const auth = await requireAuth({ role: "ADMIN" });
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, role, status, email_verified, admin_notes, created_at")
      .in("role", ["ADMIN", "EMPLOYEE"])
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching employee users:", error);
    return { success: false, error: error.message };
  }
}
