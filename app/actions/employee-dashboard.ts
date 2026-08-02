"use server";

import { requireAuth } from '@/lib/auth/server-auth';
import { createClient } from '@/lib/supabase/server';

/**
 * Batched action to get all employee dashboard data in ONE database query
 * ZERO database queries for auth, optimized queries for data
 */
export async function getEmployeeDashboardDataAction() {
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

    // OPTIMIZED QUERIES: Get all fields needed by client component
    const [statsResult, availableResult, assignmentsResult] = await Promise.all([
      // Employee stats - all needed fields
      supabase
        .from("employee_stats")
        .select("is_available, orders_completed, orders_skipped")
        .eq("user_id", employeeId)
        .maybeSingle(),

      // Available orders - all fields needed for dashboard display
      supabase
        .from("review_orders")
        .select("id, business_name, business_url, review_type, target_rating, review_content, review_instructions, credits_consumed, status, created_at")
        .eq("status", "PENDING")
        .order("created_at", { ascending: true })
        .limit(10),

      // Current assignments - all fields needed for display
      supabase
        .from("review_orders")
        .select("id, business_name, review_type, target_rating, review_content, review_instructions, assigned_at, status, created_at")
        .eq("assigned_employee_id", employeeId)
        .eq("status", "IN_PROGRESS")
        .order("assigned_at", { ascending: false })
        .limit(10),
    ]);

    const elapsed = Date.now() - startTime;
    console.log(`✅ [DASHBOARD-BATCH] Completed in ${elapsed}ms`);

    console.log(`📊 Stats:`, statsResult.data);
    console.log(`📋 Available:`, availableResult.data?.length || 0);
    console.log(`🔧 Assignments:`, assignmentsResult.data?.length || 0);

    // Return default stats if none exist (convert to camelCase)
    const employeeStats = statsResult.data || {
      isAvailable: true,
      ordersCompleted: 0,
      ordersSkipped: 0
    };

    // Convert stats to camelCase for client
    const camelStats = statsResult.data ? {
      isAvailable: statsResult.data.is_available,
      ordersCompleted: statsResult.data.orders_completed,
      ordersSkipped: statsResult.data.orders_skipped
    } : employeeStats;

    // Convert all data to plain objects with camelCase (no Date objects)
    const plainData = {
      success: true,
      data: {
        stats: camelStats,
        availableOrders: (availableResult.data || []).map((order: any) => ({
          id: order.id,
          businessName: order.business_name,
          reviewType: order.review_type,
          targetRating: order.target_rating,
          creditsConsumed: order.credits_consumed,
          createdAt: order.created_at,
          reviewContent: order.review_content,
          reviewInstructions: order.review_instructions,
          businessUrl: order.business_url,
          status: order.status
        })),
        currentAssignments: (assignmentsResult.data || []).map((assignment: any) => ({
          id: assignment.id,
          businessName: assignment.business_name,
          reviewType: assignment.review_type,
          reviewContent: assignment.review_content,
          reviewInstructions: assignment.review_instructions,
          targetRating: assignment.target_rating,
          assignedAt: assignment.assigned_at,
          createdAt: assignment.created_at,
          status: assignment.status
        }))
      }
    };

    console.log("✅ [DASHBOARD-BATCH] Returning plain data");
    return plainData;

  } catch (error: any) {
    console.error('❌ [DASHBOARD-BATCH] Error:', error);
    return { success: false, error: error.message };
  }
}

