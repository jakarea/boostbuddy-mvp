"use server";

import { requireAuth } from '@/lib/auth/server-auth';
import { createClient } from '@/lib/supabase/server';

/**
 * Type exports for client components
 */
export interface UrlTask {
  id: string;
  reviewOrderId: string;
  reviewIndex: number;
  url: string;
  quantity: number;
  reviewContent: string | null;
  status: string;
  orderType: string;
  businessName: string;
  reviewInstructions: string | null;
  photos: string[] | null;
  reactionType: string | null;
  createdAt: string;
  assignedAt?: string;
}

export interface DashboardData {
  stats: {
    isAvailable: boolean;
    acceptingTasks: boolean;
    tasksCompleted: number;
  };
  availableTasks: UrlTask[];
  currentAssignments: UrlTask[];
}

/**
 * Batched action to get all employee dashboard data
 * Updated for multi-URL task distribution system
 */
export async function getEmployeeDashboardDataAction(): Promise<{ success: true; data: DashboardData } | { success: false; error: string }> {
  try {
    console.log("📊 [DASHBOARD-BATCH] Starting...");

    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const startTime = Date.now();
    const supabase = await createClient();
    const employeeId = auth.user.id;

    console.log("👤 [DASHBOARD-BATCH] Fetching data for employee:", employeeId);

    // OPTIMIZED QUERIES for URL tasks
    const [statsResult, availableResult, assignmentsResult] = await Promise.all([
      // Employee stats - include accepting_tasks for task distribution control
      supabase
        .from("employee_stats")
        .select("is_available, accepting_tasks, orders_completed")
        .eq("user_id", employeeId)
        .maybeSingle(),

      // Available URL tasks - PENDING ReviewUrl entries
      supabase
        .from("review_urls")
        .select(`
          id,
          review_order_id,
          review_index,
          url,
          quantity,
          review_content,
          status,
          photos,
          reaction_type,
          created_at,
          review_orders!inner(
            id,
            order_type,
            business_name,
            review_instructions,
            user_id
          )
        `)
        .eq("status", "PENDING")
        .order("created_at", { ascending: true })
        .limit(20),

      // Current assignments - ASSIGNED ReviewUrl entries for this employee
      supabase
        .from("review_urls")
        .select(`
          id,
          review_order_id,
          review_index,
          url,
          quantity,
          review_content,
          status,
          photos,
          reaction_type,
          assigned_at,
          created_at,
          review_orders!inner(
            id,
            order_type,
            business_name,
            review_instructions
          )
        `)
        .eq("assigned_employee_id", employeeId)
        .eq("status", "ASSIGNED")
        .order("assigned_at", { ascending: false })
        .limit(20),
    ]);

    const elapsed = Date.now() - startTime;
    console.log(`✅ [DASHBOARD-BATCH] Completed in ${elapsed}ms`);

    console.log(`📊 Stats:`, statsResult.data);
    console.log(`📋 Available Tasks:`, availableResult.data?.length || 0);
    console.log(`🔧 Assignments:`, assignmentsResult.data?.length || 0);

    // Convert stats to camelCase for client
    const camelStats = statsResult.data ? {
      isAvailable: statsResult.data.is_available ?? true,
      acceptingTasks: statsResult.data.accepting_tasks ?? true,
      tasksCompleted: statsResult.data.orders_completed ?? 0
    } : {
      isAvailable: true,
      acceptingTasks: true,
      tasksCompleted: 0
    };

    // Helper to convert ReviewUrl + ReviewOrder to flat task object
    const toUrlTask = (ru: any): UrlTask => ({
      id: ru.id,
      reviewOrderId: ru.review_order_id,
      reviewIndex: ru.review_index,
      url: ru.url,
      quantity: ru.quantity,
      reviewContent: ru.review_content,
      status: ru.status,
      photos: ru.photos,
      reactionType: ru.reaction_type,
      createdAt: ru.created_at,
      assignedAt: ru.assigned_at,
      // Flatten review_orders data
      orderType: ru.review_orders?.order_type || "REVIEW",
      businessName: ru.review_orders?.business_name || "Unknown Business",
      reviewInstructions: ru.review_orders?.review_instructions
    });

    const plainData: DashboardData = {
      stats: camelStats,
      availableTasks: (availableResult.data || []).map(toUrlTask),
      currentAssignments: (assignmentsResult.data || []).map(toUrlTask)
    };

    console.log("✅ [DASHBOARD-BATCH] Returning plain data");
    return { success: true, data: plainData };

  } catch (error: any) {
    console.error('❌ [DASHBOARD-BATCH] Error:', error);
    return { success: false, error: error.message };
  }
}

