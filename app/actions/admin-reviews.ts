"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server-auth";
import { revalidatePath } from "next/cache";
import { getLocalDb, logOperation, DB_MODE } from "@/lib/db/client";
import { randomUUID } from "crypto";

// ============================================
// TYPES
// ============================================

export type ReviewOrderFilter = {
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ReviewOrderData = {
  businessName: string;
  businessUrl?: string;
  reviewType: "GOOGLE" | "TRUSTPILOT" | "YELP" | "FACEBOOK" | "AMAZON";
  targetRating: "5_STAR" | "4_STAR" | "3_STAR" | "2_STAR" | "1_STAR";
  reviewContent: string;
  reviewInstructions?: string;
};

export type AdminAssignmentData = {
  orderId: string;
  employeeId: string;
};

// ============================================
// ADMIN REVIEW MANAGEMENT ACTIONS
// ============================================

/**
 * Get all review orders (admin only)
 */
export async function getAllReviewOrdersAction(filters?: ReviewOrderFilter) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    if (DB_MODE === 'local') {
      logOperation('SELECT', 'ReviewOrder', DB_MODE);
      const db = getLocalDb();

      let query = `
        SELECT
          ro.*,
          u.name as clientName,
          u.email as clientEmail,
          e.name as employeeName,
          e.email as employeeEmail
        FROM ReviewOrder ro
        LEFT JOIN User u ON ro.userId = u.id
        LEFT JOIN User e ON ro.assignedEmployeeId = e.id
        WHERE 1=1
      `;

      const params: any[] = [];

      if (filters?.status) {
        query += ' AND ro.status = ?';
        params.push(filters.status);
      }

      if (filters?.employeeId) {
        query += ' AND ro.assignedEmployeeId = ?';
        params.push(filters.employeeId);
      }

      query += ' ORDER BY ro.createdAt DESC';

      const orders = db.prepare(query).all(...params);
      db.close();
      return { success: true, data: orders };
    } else {
      const supabase = await createClient();
      let query = supabase
        .from("review_orders")
        .select("*, users:review_order_client_id(name, email), employees:assigned_employee_id(name, email)")
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.employeeId) {
        query = query.eq("assigned_employee_id", filters.employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Assign review order to employee (admin only)
 */
export async function assignReviewToEmployeeAction(data: AdminAssignmentData) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const now = new Date().toISOString();

    if (DB_MODE === 'local') {
      logOperation('UPDATE', 'ReviewOrder', DB_MODE);
      const db = getLocalDb();

      // Get order and employee info
      const order = db.prepare(`
        SELECT id, status, assignedEmployeeId FROM ReviewOrder WHERE id = ?
      `).get(data.orderId) as any;

      const employee = db.prepare(`
        SELECT id, isActive, acceptingOrders FROM User WHERE id = ? AND role = 'EMPLOYEE'
      `).get(data.employeeId) as any;

      if (!order) {
        db.close();
        return { success: false, error: "Order not found" };
      }

      if (order.status !== 'PENDING') {
        db.close();
        return { success: false, error: "Order must be PENDING to assign" };
      }

      if (!employee) {
        db.close();
        return { success: false, error: "Employee not found or not active" };
      }

      if (!employee.acceptingOrders) {
        db.close();
        return { success: false, error: "Employee is not currently accepting orders" };
      }

      // Assign order
      db.prepare(`
        UPDATE ReviewOrder
        SET assignedEmployeeId = ?, status = 'IN_PROGRESS', assignedAt = ?
        WHERE id = ?
      `).run(data.employeeId, now, data.orderId);

      // Update employee stats
      db.prepare(`
        INSERT OR IGNORE INTO EmployeeStats (id, userId, isAvailable, ordersCompleted, ordersSkipped, createdAt, updatedAt)
        VALUES (?, ?, 1, 0, 0, ?, ?)
      `).run(randomUUID(), data.employeeId, now, now);

      db.prepare(`
        UPDATE EmployeeStats SET lastActiveAt = ? WHERE userId = ?
      `).run(now, data.employeeId);

      db.close();

      // Send notification to employee
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          employee.email || data.employeeId,
          "📝 New Review Order Assigned",
          `You have been assigned a review order for ${order.businessName}. Check your dashboard for details.`,
          "TELEGRAM",
          "REVIEWS_ORDER_ASSIGNED"
        );
      } catch (notifError) {
        console.warn("Failed to send notification:", notifError);
      }

      revalidatePath("/admin/reviews");
      revalidatePath("/employee/dashboard");

      return { success: true };
    } else {
      const supabase = await createAdminClient();

      // Check order status
      const { data: order } = await supabase
        .from("review_orders")
        .select("id, status, business_name, assigned_employee_id")
        .eq("id", data.orderId)
        .single();

      if (!order || order.status !== "PENDING") {
        return { success: false, error: "Order not found or must be PENDING" };
      }

      // Check employee availability
      const { data: employee } = await supabase
        .from("users")
        .select("id, email, accepting_orders")
        .eq("id", data.employeeId)
        .eq("role", "EMPLOYEE")
        .eq("is_active", true)
        .single();

      if (!employee || !employee.accepting_orders) {
        return { success: false, error: "Employee not found or not accepting orders" };
      }

      // Assign order
      const { error: assignError } = await supabase
        .from("review_orders")
        .update({
          assigned_employee_id: data.employeeId,
          status: "IN_PROGRESS",
          assigned_at: now
        })
        .eq("id", data.orderId);

      if (assignError) throw assignError;

      // Update employee last active
      await supabase
        .from("employee_stats")
        .update({ last_active_at: now })
        .eq("user_id", data.employeeId);

      // Send notification
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          employee.email || data.employeeId,
          "📝 New Review Order Assigned",
          `You have been assigned a review order for ${order.business_name}. Check your dashboard for details.`,
          "TELEGRAM",
          "REVIEWS_ORDER_ASSIGNED"
        );
      } catch (notifError) {
        console.warn("Failed to send notification:", notifError);
      }

      revalidatePath("/admin/reviews");
      revalidatePath("/employee/dashboard");

      return { success: true };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Cancel review order with refund (admin only)
 */
export async function cancelReviewOrderAction(orderId: string, reason: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    if (!reason || reason.trim().length === 0) {
      return { success: false, error: "Reason is required" };
    }

    const now = new Date().toISOString();

    if (DB_MODE === 'local') {
      logOperation('UPDATE', 'ReviewOrder', DB_MODE);
      const db = getLocalDb();

      // Get order details
      const order = db.prepare(`
        SELECT id, userId, status, creditsConsumed, assignedEmployeeId FROM ReviewOrder WHERE id = ?
      `).get(orderId) as any;

      if (!order) {
        db.close();
        return { success: false, error: "Order not found" };
      }

      if (order.status === 'CANCELLED') {
        db.close();
        return { success: false, error: "Order already cancelled" };
      }

      // Refund credits if not already completed
      if (order.status !== 'COMPLETED') {
        const user = db.prepare('SELECT creditsBalance FROM User WHERE id = ?').get(order.userId) as any;

        if (!user) {
          db.close();
          return { success: false, error: "User not found" };
        }

        const newBalance = user.creditsBalance + order.creditsConsumed;

        // Create refund transaction
        db.prepare(`
          INSERT INTO CreditTransaction (id, userId, amount, balanceAfter, type, description, referenceId, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          order.userId,
          order.creditsConsumed,
          newBalance,
          "REFUND",
          `Refund for cancelled order: ${reason}`,
          orderId,
          now
        );

        // Update user balance
        db.prepare('UPDATE User SET creditsBalance = ? WHERE id = ?').run(newBalance, order.userId);

        // Cancel order
        db.prepare('UPDATE ReviewOrder SET status = ?, updatedAt = ? WHERE id = ?').run('CANCELLED', now, orderId);

        db.close();

        // Send notification
        try {
          const { sendNotificationAction } = await import("./notifications");
          await sendNotificationAction(
            user.email || order.userId,
            "💰 Order Cancelled - Credits Refunded",
            `Your review order has been cancelled and ${order.creditsConsumed} credits have been refunded to your balance.`,
            "TELEGRAM",
            "REVIEWS_ORDER_CANCELLED"
          );
        } catch (notifError) {
          console.warn("Failed to send notification:", notifError);
        }
      } else {
        // Just cancel completed orders without refund
        db.prepare('UPDATE ReviewOrder SET status = ?, updatedAt = ? WHERE id = ?').run('CANCELLED', now, orderId);
        db.close();
      }

      revalidatePath("/admin/reviews");
      revalidatePath("/dashboard/services/reviews/orders");

      return { success: true };
    } else {
      const supabase = await createAdminClient();

      // Get order details
      const { data: order } = await supabase
        .from("review_orders")
        .select("id, user_id, status, credits_consumed")
        .eq("id", orderId)
        .single();

      if (!order) {
        return { success: false, error: "Order not found" };
      }

      if (order.status === "CANCELLED") {
        return { success: false, error: "Order already cancelled" };
      }

      // Refund credits if not completed
      if (order.status !== "COMPLETED") {
        const { data: user } = await supabase
          .from("users")
          .select("credits_balance, email")
          .eq("id", order.user_id)
          .single();

        if (!user) {
          return { success: false, error: "User not found" };
        }

        const newBalance = (user.credits_balance || 0) + order.credits_consumed;

        // Create refund transaction
        await supabase.from("credit_transactions").insert({
          id: randomUUID(),
          user_id: order.user_id,
          amount: order.credits_consumed,
          balance_after: newBalance,
          type: "REFUND",
          description: `Refund for cancelled order: ${reason}`,
          reference_id: orderId
        });

        // Update user balance
        await supabase
          .from("users")
          .update({ credits_balance: newBalance })
          .eq("id", order.user_id);

        // Cancel order
        const { error: cancelError } = await supabase
          .from("review_orders")
          .update({ status: "CANCELLED", updated_at: now })
          .eq("id", orderId);

        if (cancelError) throw cancelError;

        // Send notification
        try {
          const { sendNotificationAction } = await import("./notifications");
          await sendNotificationAction(
            user.email || order.user_id,
            "💰 Order Cancelled - Credits Refunded",
            `Your review order has been cancelled and ${order.credits_consumed} credits have been refunded to your balance.`,
            "TELEGRAM",
            "REVIEWS_ORDER_CANCELLED"
          );
        } catch (notifError) {
          console.warn("Failed to send notification:", notifError);
        }
      } else {
        // Just cancel completed orders
        await supabase
          .from("review_orders")
          .update({ status: "CANCELLED", updated_at: now })
          .eq("id", orderId);
      }

      revalidatePath("/admin/reviews");
      revalidatePath("/dashboard/services/reviews/orders");

      return { success: true };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get available employees for assignment (admin only)
 */
export async function getAvailableEmployeesAction() {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    if (DB_MODE === 'local') {
      logOperation('SELECT', 'User', DB_MODE);
      const db = getLocalDb();

      const employees = db.prepare(`
        SELECT
          u.id, u.name, u.email, u.isActive, u.acceptingOrders,
          es.isAvailable, es.ordersCompleted, es.lastActiveAt
        FROM User u
        LEFT JOIN EmployeeStats es ON u.id = es.userId
        WHERE u.role = 'EMPLOYEE' AND u.isActive = 1
        ORDER BY es.ordersCompleted DESC, u.name ASC
      `).all();

      db.close();
      return { success: true, data: employees };
    } else {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, is_active, accepting_orders, employee_stats(*)")
        .eq("role", "EMPLOYEE")
        .eq("is_active", true)
        .order("employee_stats.orders_completed", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;

      // Normalize to camelCase
      const normalizedData = data?.map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        isActive: emp.is_active,
        acceptingOrders: emp.accepting_orders,
        isAvailable: emp.employee_stats?.[0]?.is_available || false,
        ordersCompleted: emp.employee_stats?.[0]?.orders_completed || 0,
        lastActiveAt: emp.employee_stats?.[0]?.last_active_at || null
      })) || [];

      return { success: true, data: normalizedData };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get employee performance overview (admin only)
 */
export async function getEmployeePerformanceAction() {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    if (DB_MODE === 'local') {
      logOperation('SELECT', 'EmployeeStats', DB_MODE);
      const db = getLocalDb();

      const stats = db.prepare(`
        SELECT
          es.id,
          es.userId,
          u.name as employeeName,
          u.email as employeeEmail,
          es.isAvailable,
          es.ordersCompleted,
          es.ordersSkipped,
          es.lastActiveAt,
          es.createdAt
        FROM EmployeeStats es
        LEFT JOIN User u ON es.userId = u.id
        ORDER BY es.ordersCompleted DESC, es.lastActiveAt DESC
      `).all();

      db.close();
      return { success: true, data: stats };
    } else {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("employee_stats")
        .select("*, users:user_id(name, email)")
        .order("orders_completed", { ascending: false })
        .order("last_active_at", { ascending: false });

      if (error) throw error;
      return { success: true, data };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get pending orders queue (admin only)
 */
export async function getPendingOrdersQueueAction() {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    if (DB_MODE === 'local') {
      logOperation('SELECT', 'ReviewOrder', DB_MODE);
      const db = getLocalDb();

      const orders = db.prepare(`
        SELECT
          id, businessName, reviewType, targetRating,
          creditsConsumed, createdAt
        FROM ReviewOrder
        WHERE status = 'PENDING'
        ORDER BY createdAt ASC
      `).all();

      db.close();
      return { success: true, data: orders };
    } else {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("review_orders")
        .select("id, business_name, review_type, target_rating, credits_consumed, created_at")
        .eq("status", "PENDING")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Normalize to camelCase
      const normalizedData = data?.map(order => ({
        id: order.id,
        businessName: order.business_name,
        reviewType: order.review_type,
        targetRating: order.target_rating,
        creditsConsumed: order.credits_consumed,
        createdAt: order.created_at
      })) || [];

      return { success: true, data: normalizedData };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Verify completed review (admin only)
 */
export async function verifyCompletedReviewAction(orderId: string, approved: boolean) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const now = new Date().toISOString();

    if (DB_MODE === 'local') {
      logOperation('UPDATE', 'ReviewOrder', DB_MODE);
      const db = getLocalDb();

      // Get order details
      const order = db.prepare(`
        SELECT id, status, userId FROM ReviewOrder WHERE id = ?
      `).get(orderId) as any;

      if (!order) {
        db.close();
        return { success: false, error: "Order not found" };
      }

      if (order.status !== 'COMPLETED') {
        db.close();
        return { success: false, error: "Order must be completed to verify" };
      }

      // Add verification note
      db.prepare(`
        UPDATE ReviewOrder
        SET clientFeedback = ?, updatedAt = ?
        WHERE id = ?
      `).run(approved ? "APPROVED" : "REJECTED", now);

      db.close();

      // Send notification to client
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          order.userId,
          approved ? "✅ Review Approved by Admin" : "❌ Review Rejected by Admin",
          approved
            ? "Your completed review has been approved by our quality team."
            : "Your completed review did not meet our quality standards. Please revise and resubmit.",
          "TELEGRAM",
          "REVIEWS_REVIEW_VERIFIED"
        );
      } catch (notifError) {
        console.warn("Failed to send notification:", notifError);
      }

      revalidatePath("/admin/reviews");
      revalidatePath("/dashboard/services/reviews/orders");

      return { success: true };
    } else {
      const supabase = await createAdminClient();

      // Get order details
      const { data: order } = await supabase
        .from("review_orders")
        .select("id, status, user_id")
        .eq("id", orderId)
        .single();

      if (!order) {
        return { success: false, error: "Order not found" };
      }

      if (order.status !== "COMPLETED") {
        return { success: false, error: "Order must be completed to verify" };
      }

      // Update verification status
      const { error: updateError } = await supabase
        .from("review_orders")
        .update({
          client_feedback: approved ? "APPROVED" : "REJECTED",
          updated_at: now
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Send notification
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          order.user_id,
          approved ? "✅ Review Approved by Admin" : "❌ Review Rejected by Admin",
          approved
            ? "Your completed review has been approved by our quality team."
            : "Your completed review did not meet our quality standards. Please revise and resubmit.",
          "TELEGRAM",
          "REVIEWS_REVIEW_VERIFIED"
        );
      } catch (notifError) {
        console.warn("Failed to send notification:", notifError);
      }

      revalidatePath("/admin/reviews");
      revalidatePath("/dashboard/services/reviews/orders");

      return { success: true };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get admin reviews overview stats
 */
export async function getReviewsOverviewAction() {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    if (DB_MODE === 'local') {
      logOperation('SELECT', 'ReviewOrder', DB_MODE);
      const db = getLocalDb();

      // Get stats
      const totalOrders = db.prepare('SELECT COUNT(*) as count FROM ReviewOrder').get() as any;
      const pendingOrders = db.prepare('SELECT COUNT(*) as count FROM ReviewOrder WHERE status = ?').get('PENDING') as any;
      const inProgressOrders = db.prepare('SELECT COUNT(*) as count FROM ReviewOrder WHERE status = ?').get('IN_PROGRESS') as any;
      const completedOrders = db.prepare('SELECT COUNT(*) as count FROM ReviewOrder WHERE status = ?').get('COMPLETED') as any;

      // Get revenue from credits
      const revenue = db.prepare('SELECT SUM(creditsConsumed) as total FROM ReviewOrder WHERE status != ?').get('CANCELLED') as any;

      // Get employee stats
      const employeeStats = db.prepare(`
        SELECT COUNT(*) as count, SUM(ordersCompleted) as completed, SUM(ordersSkipped) as skipped
        FROM EmployeeStats
      `).get() as any;

      db.close();

      return {
        success: true,
        data: {
          totalOrders: totalOrders?.count || 0,
          pendingOrders: pendingOrders?.count || 0,
          inProgressOrders: inProgressOrders?.count || 0,
          completedOrders: completedOrders?.count || 0,
          totalRevenue: revenue?.total || 0,
          totalEmployees: employeeStats?.count || 0,
          employeeCompleted: employeeStats?.completed || 0,
          employeeSkipped: employeeStats?.skipped || 0
        }
      };
    } else {
      const supabase = await createClient();

      const [totalOrders, pendingOrders, inProgressOrders, completedOrders, revenue, employeeStats] = await Promise.all([
        supabase.from("review_orders").select("id", { count: "exact", head: true }),
        supabase.from("review_orders").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("review_orders").select("id", { count: "exact", head: true }).eq("status", "IN_PROGRESS"),
        supabase.from("review_orders").select("id", { count: "exact", head: true }).eq("status", "COMPLETED"),
        supabase.from("review_orders").select("credits_consumed").select("credits_consumed"),
        supabase.from("employee_stats").select("id", { count: "exact", head: true })
      ]);

      const totalRevenue = revenue.data?.reduce((sum: any, item: any) => {
        return sum + (item.credits_consumed || 0);
      }, 0);

      return {
        success: true,
        data: {
          totalOrders: totalOrders.count || 0,
          pendingOrders: pendingOrders.count || 0,
          inProgressOrders: inProgressOrders.count || 0,
          completedOrders: completedOrders.count || 0,
          totalRevenue: totalRevenue,
          totalEmployees: employeeStats.count || 0,
          employeeCompleted: 0,
          employeeSkipped: 0
        }
      };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
