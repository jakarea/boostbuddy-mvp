"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server-auth";

/**
 * Get employee leaderboard stats filtered by date range (Admin only)
 */
export async function getEmployeeLeaderboardAction(range: {
  startDate: string;
  endDate: string;
}) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized - Admin only" };
    }

    const supabase = await createClient();

    // Get all employees
    const { data: employees, error: employeesError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("role", "EMPLOYEE");

    if (employeesError) throw employeesError;

    // Get stats for each employee within date range
    const employeesWithStats = await Promise.all(
      (employees || []).map(async (employee) => {
        // Get completed orders within date range
        const { data: orders } = await (await createAdminClient())
          .from("review_orders")
          .select("credits_consumed, completed_at")
          .eq("completed_by_employee_id", employee.id)
          .eq("status", "COMPLETED")
          .gte("completed_at", range.startDate)
          .lte("completed_at", range.endDate);

        const ordersCompleted = orders?.length || 0;
        const creditsCompleted = orders?.reduce((sum, order) => sum + (order.credits_consumed || 0), 0) || 0;

        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          ordersCompleted,
          creditsCompleted
        };
      })
    );

    // Sort by credits completed (descending)
    employeesWithStats.sort((a, b) => b.creditsCompleted - a.creditsCompleted);

    return {
      success: true,
      data: employeesWithStats
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get current employee's stats filtered by date range
 */
export async function getMyEmployeeStatsByRangeAction(range: {
  startDate: string;
  endDate: string;
}) {
  try {
    const auth = await requireAuth();
    if (!auth.success) {
      console.error('[EMPLOYEE_STATS] Auth failed:', auth.error);
      return auth;
    }

    // Allow both EMPLOYEE and ADMIN to access this (for testing)
    if (auth.user.role !== "EMPLOYEE" && auth.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized - Employee or Admin only" };
    }

    const adminClient = await createAdminClient();

    // Get completed orders within date range for current employee
    const { data: orders, error } = await adminClient
      .from("review_orders")
      .select("credits_consumed, completed_at")
      .eq("completed_by_employee_id", auth.user.id)
      .eq("status", "COMPLETED")
      .gte("completed_at", range.startDate)
      .lte("completed_at", range.endDate);

    if (error) {
      console.error('[EMPLOYEE_STATS] Query error:', error);
      throw error;
    }

    const ordersCompleted = orders?.length || 0;
    const creditsCompleted = orders?.reduce((sum, order) => sum + (order.credits_consumed || 0), 0) || 0;

    // Calculate today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayOrders = orders?.filter(order => {
      const completedAt = new Date(order.completed_at);
      return completedAt >= today && completedAt <= todayEnd;
    }) || [];

    const todayOrdersCompleted = todayOrders.length;
    const todayCreditsCompleted = todayOrders.reduce((sum, order) => sum + (order.credits_consumed || 0), 0);

    return {
      success: true,
      data: {
        ordersCompleted,
        creditsCompleted,
        todayOrdersCompleted,
        todayCreditsCompleted
      }
    };
  } catch (error: any) {
    console.error('[EMPLOYEE_STATS] Exception:', error);
    return { success: false, error: error.message || "Failed to fetch stats" };
  }
}

/**
 * Get all employees stats filtered by date range (Admin only)
 * Returns unsorted data for employee list view
 */
export async function getAllEmployeesStatsByRangeAction(range: {
  startDate: string;
  endDate: string;
}) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized - Admin only" };
    }

    const supabase = await createClient();

    // Get all employees
    const { data: employees, error: employeesError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("role", "EMPLOYEE");

    if (employeesError) throw employeesError;

    // Get stats for each employee within date range
    const employeesWithStats = await Promise.all(
      (employees || []).map(async (employee) => {
        // Get completed orders within date range
        const { data: orders } = await (await createAdminClient())
          .from("review_orders")
          .select("credits_consumed, completed_at")
          .eq("completed_by_employee_id", employee.id)
          .eq("status", "COMPLETED")
          .gte("completed_at", range.startDate)
          .lte("completed_at", range.endDate);

        const ordersCompleted = orders?.length || 0;
        const creditsCompleted = orders?.reduce((sum, order) => sum + (order.credits_consumed || 0), 0) || 0;

        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          ordersCompleted,
          creditsCompleted
        };
      })
    );

    return {
      success: true,
      data: employeesWithStats
    };
  } catch (error: any) {
    console.error('[ALL_EMPLOYEES_STATS] Exception:', error);
    return { success: false, error: error.message || "Failed to fetch stats" };
  }
}
