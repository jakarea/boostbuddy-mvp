"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server-auth";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// ============================================
// TYPES
// ============================================

export type ReviewOrderFilter = {
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  searchTerm?: string;
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
 * Includes skip information from employees
 * Now supports server-side pagination and search
 */
export async function getAllReviewOrdersAction(filters?: ReviewOrderFilter) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createClient();
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const startIndex = (page - 1) * pageSize;

    // Build count query
    let countQuery = supabase
      .from("review_orders")
      .select("id", { count: "exact", head: true });

    if (filters?.status) {
      countQuery = countQuery.eq("status", filters.status);
    }

    if (filters?.employeeId) {
      countQuery = countQuery.eq("assigned_employee_id", filters.employeeId);
    }

    // Prepare sanitized search term if provided
    let sanitizedSearch = '';
    if (filters?.searchTerm && filters.searchTerm.trim()) {
      const { sanitizeSearchInput, isSafeSearchInput } = await import("@/lib/search");
      sanitizedSearch = sanitizeSearchInput(filters.searchTerm);

      if (!isSafeSearchInput(sanitizedSearch)) {
        console.warn('[SECURITY] Unsafe search term rejected:', filters.searchTerm);
        sanitizedSearch = '';
      }
    }

    // Add search to count query if provided
    if (sanitizedSearch) {
      countQuery = countQuery.or(`business_name.ilike.%${sanitizedSearch}%,id.ilike.%${sanitizedSearch}%`);
    }

    // Build the main query with pagination
    let query = supabase
      .from("review_orders")
      .select("*, users:user_id(name, email), employees:assigned_employee_id(name, email)")
      .order("created_at", { ascending: false })
      .range(startIndex, startIndex + pageSize - 1);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.employeeId) {
      query = query.eq("assigned_employee_id", filters.employeeId);
    }

    // Add search filter if provided (using same sanitized term)
    if (sanitizedSearch) {
      query = query.or(`business_name.ilike.%${sanitizedSearch}%,id.ilike.%${sanitizedSearch}%`);
    }

    // Parallelize count and data queries (independent operations)
    const [
      { count: totalCount, error: countError },
      { data: orders, error }
    ] = await Promise.all([countQuery, query]);

    if (countError) throw countError;
    if (error) throw error;

    // Normalize field names from snake_case to camelCase
    const ordersWithSkips = orders?.map((order: any) => {
      const normalizedOrder = {
        ...order,
        // Normalize database column names from snake_case to camelCase
        targetRating: order.target_rating,
        facebookUrl: order.facebook_url,
        businessName: order.business_name,
        orderType: order.order_type,
        reviewType: order.review_type,
        reviewContent: order.review_content,
        reviewInstructions: order.review_instructions,
        proofOfCompletion: order.proof_of_completion,
        creditsConsumed: order.credits_consumed,
        assignedEmployeeId: order.assigned_employee_id,
        assignedAt: order.assigned_at,
        completedAt: order.completed_at,
        adminVerificationStatus: order.admin_verification_status,
        adminVerifiedAt: order.admin_verified_at,
        clientFeedback: order.client_feedback,
        content: order.content,
        commentText: order.comment_text,
        comments: order.comment_text ? order.comment_text.split('|||').map((c: string) => c.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\')) : [],
        commentCount: order.comment_count || 1,
        completedComments: order.completed_comments ? order.completed_comments.split(',').map((i: string) => parseInt(i)) : [],
        photoUrls: order.photo_urls ? JSON.parse(order.photo_urls) : null,
        // For Photo + Reviews, parse photoUrls as array of photo arrays
        photoReviews: order.photo_urls && order.order_type === 'COMMENT_WITH_PHOTO'
          ? order.comment_text.split('|||').map((c: string, i: number) => ({
              text: c.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\'),
              photos: JSON.parse(order.photo_urls)[i] || []
            }))
          : null,
        quantity: order.quantity,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      };
      return normalizedOrder;
    }) || [];

    console.log("🔍 [ADMIN ORDERS] Returning", ordersWithSkips.length, "orders (page", page, "of", Math.ceil((totalCount || 0) / pageSize), ")");

    return {
      success: true,
      data: ordersWithSkips,
      pagination: {
        page,
        pageSize,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pageSize)
      }
    };
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
    const supabase = await createAdminClient();

    // Check order status
    const { data: order } = await supabase
      .from("review_orders")
      .select("id, status, business_name, assigned_employee_id, user_id, users:user_id(email)")
      .eq("id", data.orderId)
      .single();

    if (!order || (order as any).status !== "PENDING") {
      return { success: false, error: "Order not found or must be PENDING" };
    }

    const clientEmail = ((order as any).users as any)?.email || null;

    // Check employee availability
    const { data: employee } = await supabase
      .from("users")
      .select("id, email, accepting_orders")
      .eq("id", data.employeeId)
      .eq("role", "EMPLOYEE")
      .eq("status", "ACTIVE")
      .single();

    if (!employee || !(employee as any).accepting_orders) {
      return { success: false, error: "Employee not found or not accepting orders" };
    }

    // Assign order
    const { error: assignError } = await (supabase
      .from("review_orders") as any)
      .update({
        assigned_employee_id: data.employeeId,
        status: "IN_PROGRESS",
        assigned_at: now
      })
      .eq("id", data.orderId);

    if (assignError) throw assignError;

    // Update employee last active
    await (supabase
      .from("employee_stats") as any)
      .update({ last_active_at: now })
      .eq("user_id", data.employeeId);

    // Send notification to employee
    try {
      const { sendNotificationAction } = await import("./notifications");
      await sendNotificationAction(
        (employee as any)?.email || data.employeeId,
        "📝 New Review Order Assigned",
        `You have been assigned a review order for ${(order as any).business_name}. Check your dashboard for details.`,
        "TELEGRAM",
        "REVIEWS_ORDER_ASSIGNED",
        "HIGH",  // Priority: Real-time notification for employees
        data.orderId   // Related order ID for context
      );
    } catch (notifError) {
      console.warn("Failed to send notification:", notifError);
    }

    // Send notification to client
    if (clientEmail) {
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          clientEmail,
          "🔄 Your Review Order Is In Progress",
          `Your review order for ${(order as any).business_name} has been assigned to our team and is now being worked on.`,
          "TELEGRAM",
          "REVIEWS_ORDER_IN_PROGRESS",
          "HIGH",  // Priority: Real-time update for clients
          data.orderId   // Related order ID for context
        );
      } catch (notifError) {
        console.warn("Failed to send client notification:", notifError);
      }
    }

    revalidatePath("/a/reviews");
    revalidatePath("/e/dashboard");

    return { success: true };
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
    const supabase = await createAdminClient();

    // Get order details
    const { data: order } = await supabase
      .from("review_orders")
      .select("id, user_id, status, credits_consumed, business_name, assigned_employee_id, users:user_id(email), employees:assigned_employee_id(email)")
      .eq("id", orderId)
      .single() as any;

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if ((order as any).status === "CANCELLED") {
      return { success: false, error: "Order already cancelled" };
    }

    const clientEmail = (order.users as any)?.email || null;
    const employeeEmail = (order.employees as any)?.email || null;

    // Refund credits if not completed
    if ((order as any).status !== "COMPLETED") {
      const { data: user } = await supabase
        .from("users")
        .select("credits_balance, email")
        .eq("id", (order as any).user_id)
        .single() as any;

      if (!user) {
        return { success: false, error: "User not found" };
      }

      const newBalance = (user.credits_balance || 0) + (order as any).credits_consumed;

      // Create refund transaction
      await (supabase.from("credit_transactions") as any).insert({
        id: randomUUID(),
        user_id: (order as any).user_id,
        amount: (order as any).credits_consumed,
        balance_after: newBalance,
        type: "PURCHASE",
        description: `Refund for cancelled order: ${reason}`,
        reference_id: orderId
      });

      // Update user balance
      await (supabase.from("users") as any)
        .update({ credits_balance: newBalance })
        .eq("id", (order as any).user_id);

      // Cancel order
      const { error: cancelError } = await (supabase
        .from("review_orders") as any)
        .update({ status: "CANCELLED", updated_at: now })
        .eq("id", orderId);

      if (cancelError) throw cancelError;

      // Send notification to client
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          clientEmail || order.user_id,
          "💰 Order Cancelled - Credits Refunded",
          `Your review order for ${order.business_name} has been cancelled and ${order.credits_consumed} credits have been refunded to your balance.`,
          "TELEGRAM",
          "REVIEWS_ORDER_CANCELLED",
          "HIGH",  // Priority: Financial impact - real-time notification
          orderId   // Related order ID for context
        );
      } catch (notifError) {
        console.warn("Failed to send notification:", notifError);
      }

      // Send notification to assigned employee
      if (employeeEmail) {
        try {
          const { sendNotificationAction } = await import("./notifications");
          await sendNotificationAction(
            employeeEmail,
            "❌ Assigned Order Cancelled",
            `The review order for ${order.business_name} that was assigned to you has been cancelled by the admin. Reason: ${reason}`,
            "TELEGRAM",
            "EMPLOYEE_ORDER_CANCELLED",
            "HIGH",  // Priority: Immediate impact on employee work
            orderId   // Related order ID for context
          );
        } catch (notifError) {
          console.warn("Failed to send employee notification:", notifError);
        }
      }
    } else {
      // Just cancel completed orders
      await (supabase.from("review_orders") as any)
        .update({ status: "CANCELLED", updated_at: now })
        .eq("id", orderId);

      // Send notification to client
      if (clientEmail) {
        try {
          const { sendNotificationAction } = await import("./notifications");
          await sendNotificationAction(
            clientEmail,
            "❌ Order Cancelled",
            `Your review order for ${order.business_name} has been cancelled.`,
            "TELEGRAM",
            "REVIEWS_ORDER_CANCELLED"
          );
        } catch (notifError) {
          console.warn("Failed to send client notification:", notifError);
        }
      }
    }

    revalidatePath("/a/reviews");
    revalidatePath("/c/services/reviews/orders");

    return { success: true };
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

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, status, accepting_orders, employee_stats(*)")
      .eq("role", "EMPLOYEE")
      .eq("status", "ACTIVE")
      .order("employee_stats.orders_completed", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw error;

    // Normalize to camelCase
    const normalizedData = data?.map(emp => ({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      isActive: emp.status === 'ACTIVE',
      acceptingOrders: emp.accepting_orders,
      isAvailable: emp.employee_stats?.[0]?.is_available || false,
      ordersCompleted: emp.employee_stats?.[0]?.orders_completed || 0,
      lastActiveAt: emp.employee_stats?.[0]?.last_active_at || null
    })) || [];

    return { success: true, data: normalizedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get employee performance overview (admin only)
 * Now supports server-side pagination
 */
export async function getEmployeePerformanceAction(filters?: { page?: number; pageSize?: number; searchTerm?: string }) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createClient();
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const startIndex = (page - 1) * pageSize;

    // Get total count with optional search
    let countQuery = supabase
      .from("employee_stats")
      .select("user_id", { count: "exact", head: true });

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) throw countError;

    // Build the main query with pagination
    let query = supabase
      .from("employee_stats")
      .select("*, users:user_id(name, email, is_active, accepting_orders)")
      .order("orders_completed", { ascending: false })
      .order("last_active_at", { ascending: false })
      .range(startIndex, startIndex + pageSize - 1);

    // Add search filter if provided
    if (filters?.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.trim().toLowerCase();
      // Sanitize input to prevent PostgREST filter manipulation
      const sanitized = searchLower.replace(/[,\.\(\)%\\]/g, '');
      query = query.or(`users.name.ilike.%${sanitized}%,users.email.ilike.%${sanitized}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    console.log("👥 [EMPLOYEE PERF] Returning", data?.length, "employees (page", page, "of", Math.ceil((totalCount || 0) / pageSize), ")");

    return {
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pageSize)
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get assigned reviews for a specific employee (admin only)
 */
export async function getEmployeeAssignedReviewsAction(userId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createClient();

    // Get all review_urls assigned to this employee with their order details
    const { data, error } = await supabase
      .from("review_urls")
      .select(`
        id,
        url,
        quantity,
        status,
        assigned_at,
        review_order_id,
        review_orders (
          id,
          order_type,
          business_name
        )
      `)
      .eq("assigned_employee_id", userId)
      .in("status", ["ASSIGNED", "IN_PROGRESS", "COMPLETED"])
      .order("assigned_at", { ascending: false });

    if (error) throw error;

    // Normalize data
    const normalizedData = data?.map((item: any) => ({
      id: item.id,
      url: item.url,
      quantity: item.quantity,
      status: item.status,
      assignedAt: item.assigned_at,
      completedAt: item.completed_at,
      orderId: item.review_order_id,
      orderType: item.review_orders?.order_type || 'REVIEW',
      businessName: item.review_orders?.business_name
    })) || [];

    return { success: true, data: normalizedData };
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

    const supabase = await createClient();

    const [totalOrders, pendingOrders, inProgressOrders, completedOrders, revenue, employeeStats, employeeCompleted] = await Promise.all([
      supabase.from("review_orders").select("id", { count: "exact", head: true }),
      supabase.from("review_orders").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
      supabase.from("review_orders").select("id", { count: "exact", head: true }).eq("status", "IN_PROGRESS"),
      supabase.from("review_orders").select("id", { count: "exact", head: true }).eq("status", "COMPLETED"),
      supabase.from("review_orders").select("credits_consumed"),
      supabase.from("employee_stats").select("id", { count: "exact", head: true }),
      supabase.from("review_urls").select("id", { count: "exact", head: true }).eq("status", "COMPLETED")
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
        employeeCompleted: employeeCompleted.count || 0
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// EMPLOYEE LIFECYCLE MANAGEMENT (ADMIN)
// ============================================

export type InviteEmployeeState = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * Invite a new employee to the platform (admin only).
 * Creates the auth user via Supabase Admin API and upserts the profile row.
 * In local mode, also writes to SQLite so the employee appears in the admin list immediately.
 */
export async function inviteEmployeeAction(
  prevState: InviteEmployeeState | null,
  formData: FormData
): Promise<InviteEmployeeState> {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return { success: false, error: auth.error };

    const rawName = (formData.get("name") as string | null)?.toString().trim();
    const rawEmail = (formData.get("email") as string | null)?.toString().trim().toLowerCase();

    if (!rawName || !rawEmail) {
      return { success: false, error: "Name and email are required" };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      return { success: false, error: "Please enter a valid email address" };
    }

    const name = rawName;
    const email = rawEmail;
    const role = "EMPLOYEE";

    // 1. Initialize Admin Client
    let supabaseAdmin;
    try {
      supabaseAdmin = createAdminClient();
    } catch (e: any) {
      return {
        success: false,
        error: "Server configuration error: " + e.message,
      };
    }

    // 2. Invite user via Supabase Auth Admin API
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3400";
    const redirectTo = `${siteUrl}/dashboard`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name, role },
      redirectTo,
    });

    if (authError) {
      // Gracefully handle "user already exists"
      return { success: false, error: "Failed to invite employee: " + authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create employee account. No user data returned." };
    }

    // 3. Upsert into public.users table (role EMPLOYEE, ACTIVE, accepting orders by default)
    const { error: dbError } = await (supabaseAdmin
      .from("users") as any)
      .upsert({
        id: authData.user.id,
        email,
        name,
        role,
        status: "ACTIVE",
        is_active: true,
        accepting_orders: true,
      }, { onConflict: "id" });

    if (dbError) {
      console.error("Failed to upsert into public.users:", dbError);
      return {
        success: false,
        error: "Employee was invited but failed to create database profile: " + dbError.message,
      };
    }

    revalidatePath("/a/reviews/employees");

    return {
      success: true,
      message: `Successfully sent invitation to ${email}`,
    };
  } catch (error: any) {
    console.error("Invite Employee Action Error:", error);
    return {
      success: false,
      error: "An unexpected error occurred while creating the employee account.",
    };
  }
}

/**
 * Toggle an employee's "accepting orders" flag — the days-off switch.
 * Pauses new order assignment without deactivating the account.
 */
export async function toggleEmployeeAcceptingOrdersAction(userId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createAdminClient();

    const { data: current } = await (supabase
      .from("users") as any)
      .select("accepting_orders")
      .eq("id", userId)
      .eq("role", "EMPLOYEE")
      .single();

    if (!current) {
      return { success: false, error: "Employee not found" };
    }

    const newStatus = !current.accepting_orders;

    const { error: updateError } = await (supabase
      .from("users") as any)
      .update({ accepting_orders: newStatus })
      .eq("id", userId)
      .eq("role", "EMPLOYEE");

    if (updateError) throw updateError;

    revalidatePath("/a/reviews/employees");
    return { success: true, data: { acceptingOrders: Boolean(newStatus) } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Activate or deactivate an employee account (full lifecycle control).
 * Deactivated employees are blocked from /e/* via the layout redirect.
 */
export async function setEmployeeActiveStatusAction(userId: string, isActive: boolean) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createAdminClient();

    const { error: updateError, count } = await (supabase
      .from("users") as any)
      .update({ is_active: isActive })
      .eq("id", userId)
      .eq("role", "EMPLOYEE");

    if (updateError) throw updateError;
    if (count === 0) {
      return { success: false, error: "Employee not found" };
    }

    revalidatePath("/a/reviews/employees");
    return { success: true, data: { isActive } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get full detail for a single review order, scoped to the caller's role.
 * Employees may only view orders assigned to them; admins may view any order.
 */
export async function getEmployeeOrderDetailAction(orderId: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { data: order, error } = await supabase
      .from("review_orders")
      .select("*, users:user_id(name, email), employees:assigned_employee_id(name, email)")
      .eq("id", orderId)
      .single();

    if (error) throw error;
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Employees can only view orders assigned to them
    if (auth.user.role === 'EMPLOYEE' && order.assigned_employee_id !== auth.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    return { success: true, data: order };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// TASK DISTRIBUTION CONTROL (NEW)
// ============================================

/**
 * Toggle employee task distribution ON/OFF
 * Separate from account activation - controls whether employee receives new tasks
 */
export async function toggleEmployeeTaskDistributionAction(userId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = await createAdminClient();

    const { data: current } = await (supabaseAdmin as any)
      .from("employee_stats")
      .select("accepting_tasks")
      .eq("user_id", userId)
      .single();

    if (!current) {
      // Create employee stats if not exists
      await (supabaseAdmin as any)
        .from("employee_stats")
        .insert({
          user_id: userId,
          accepting_tasks: true,
          is_available: true,
          orders_completed: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      revalidatePath("/a/employees");

      return { success: true, data: { acceptingTasks: true } };
    }

    const newStatus = !current.accepting_tasks;

    const { error: updateError } = await (supabaseAdmin as any)
      .from("employee_stats")
      .update({ accepting_tasks: newStatus, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    revalidatePath("/a/employees");

    return { success: true, data: { acceptingTasks: Boolean(newStatus) } };
  } catch (error: any) {
    console.error("❌ [TASK DISTRIBUTION TOGGLE] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get employee task distribution status
 */
export async function getEmployeeTaskDistributionAction(userId: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("employee_stats")
      .select("accepting_tasks")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    return {
      success: true,
      data: {
        acceptingTasks: data?.accepting_tasks ?? true
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get single review order by ID (admin only)
 * Includes full details with client and employee information
 */
export async function getReviewOrderByIdAction(orderId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createClient();

    const { data: order, error } = await supabase
      .from("review_orders")
      .select(`
        *,
        users:user_id(name, email),
        employees:assigned_employee_id(name, email),
        review_urls(
          id,
          url,
          quantity,
          reaction_type,
          review_index,
          status,
          assigned_employee_id,
          assigned_at,
          completed_at,
          proof_of_completion
        )
      `)
      .eq("id", orderId)
      .single();

    if (error) throw error;
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Normalize field names from snake_case to camelCase
    const normalizedOrder = {
      ...order,
      targetRating: order.target_rating,
      facebookUrl: order.facebook_url,
      businessName: order.business_name,
      orderType: order.order_type,
      reviewType: order.review_type,
      reviewContent: order.review_content,
      reviewInstructions: order.review_instructions,
      proofOfCompletion: order.proof_of_completion,
      creditsConsumed: order.credits_consumed,
      assignedEmployeeId: order.assigned_employee_id,
      assignedAt: order.assigned_at,
      completedAt: order.completed_at,
      adminVerificationStatus: order.admin_verification_status,
      adminVerifiedAt: order.admin_verified_at,
      clientFeedback: order.client_feedback,
      content: order.content,
      commentText: order.comment_text,
      comments: order.comment_text ? order.comment_text.split('|||').map((c: string) => c.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\')) : [],
      commentCount: order.comment_count || 1,
      completedComments: order.completed_comments ? order.completed_comments.split(',').map((i: string) => parseInt(i)) : [],
      photoUrls: order.photo_urls ? JSON.parse(order.photo_urls) : null,
      photoReviews: order.photo_urls && order.order_type === 'COMMENT_WITH_PHOTO'
        ? order.comment_text.split('|||').map((c: string, i: number) => ({
            text: c.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\'),
            photos: JSON.parse(order.photo_urls)[i] || []
          }))
        : null,
      reviewUrls: Array.isArray(order.review_urls) ? order.review_urls.map((ru: any) => ({
        id: ru.id,
        url: ru.url,
        quantity: ru.quantity,
        reactionType: ru.reaction_type,
        reviewIndex: ru.review_index,
        status: ru.status,
        assignedEmployeeId: ru.assigned_employee_id,
        assignedAt: ru.assigned_at,
        completedAt: ru.completed_at,
        proofOfCompletion: ru.proof_of_completion
      })) : [],
      quantity: order.quantity,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    };

    return { success: true, data: normalizedOrder };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
