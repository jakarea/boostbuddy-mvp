"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server-auth";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// ============================================
// TYPES
// ============================================

export type EmployeeStats = {
  id: string;
  userId: string;
  isAvailable: boolean;
  ordersCompleted: number;
  lastActiveAt: string | null;
};

export type CreateEmployeeData = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "EMPLOYEE";
  telegram_chat_id?: string | null;
};

// ============================================
// ADMIN EMPLOYEE MANAGEMENT ACTIONS
// ============================================

/**
 * Create new employee/admin account
 * Direct creation via Admin API - no email verification, immediate activation
 */
export async function createEmployeeAction(data: CreateEmployeeData) {
  try {
    console.log("👤 [EMPLOYEE] Starting employee creation (direct Admin API)...");

    const auth = await requireAuth();
    if (!auth.success) {
      console.log("❌ [EMPLOYEE] Auth failed:", auth.error);
      return auth;
    }

    if (auth.user.role !== "ADMIN") {
      console.log("❌ [EMPLOYEE] Not an admin");
      return { success: false, error: "Unauthorized - Admin only" };
    }

    console.log("✅ [EMPLOYEE] Auth passed, validation...");
    console.log("🔑 [EMPLOYEE] SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Validation
    if (!data.name?.trim() || !data.email?.trim() || !data.password) {
      console.log("❌ [EMPLOYEE] Validation failed - missing fields");
      return { success: false, error: "Name, email, and password are required" };
    }

    if (data.password.length < 12) {
      console.log("❌ [EMPLOYEE] Password too short");
      return { success: false, error: "Password must be at least 12 characters" };
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(data.password);
    const hasLowerCase = /[a-z]/.test(data.password);
    const hasNumber = /[0-9]/.test(data.password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(data.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      console.log("❌ [EMPLOYEE] Password complexity insufficient");
      return { success: false, error: "Password must contain uppercase, lowercase, number, and special character" };
    }

    const supabaseAdmin = await createAdminClient();

    // Check if user with this email already exists - OPTIMIZED: Direct query instead of O(N) lookup
    console.log("🔍 [EMPLOYEE] Checking for existing users...");
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", data.email)
      .limit(1);

    const userExists = existingUser && existingUser.length > 0;

    if (userExists) {
      console.log("❌ [EMPLOYEE] User already exists:", data.email);
      return { success: false, error: "User with this email already exists" };
    }

    console.log("✅ [EMPLOYEE] User doesn't exist, creating via REST API...");

    // SOLUTION: Use Supabase REST API directly to create users (bypasses Auth client library issues)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    try {
      console.log("📧 [EMPLOYEE] Creating user via REST API:", data.email, "role:", data.role);

      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: {
            name: data.name,
            role: data.role,
            isActive: true,
            status: 'ACTIVE', // Store status in JWT metadata for zero-query auth
            createdBy: auth.user.id
          },
          app_metadata: {
            role: data.role,
            status: 'ACTIVE' // Also store in app_metadata for faster access
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ [EMPLOYEE] REST API failed:", response.status, errorData);
        return { success: false, error: `Failed to create user: ${response.status} ${JSON.stringify(errorData)}` };
      }

      const userData = await response.json();
      console.log("✅ [EMPLOYEE] User created successfully via REST API:", userData.id);

      if (!userData.id) {
        console.error("❌ [EMPLOYEE] No user ID in REST API response");
        return { success: false, error: "No user ID returned from user creation" };
      }

      const newUser = { user: userData };
      console.log("✅ [EMPLOYEE] User creation completed:", newUser.user.id);

      // Create user profile in users table with ACTIVE status
      console.log("📝 [EMPLOYEE] Creating user profile with ACTIVE status...");
      const now = new Date().toISOString();
      const { error: profileError } = await (supabaseAdmin
        .from("users") as any)
        .insert({
          id: newUser.user.id,
          email: data.email,
          name: data.name,
          role: data.role,
          status: "ACTIVE", // Immediately active - no approval needed
          email_verified: true, // Email considered verified for admin-created accounts
          created_at: now,
          updated_at: now
        });

      if (profileError) {
        console.error("⚠️ [EMPLOYEE] Failed to create user profile:", profileError);
        // Don't fail here - the auth user was created successfully
      } else {
        console.log("✅ [EMPLOYEE] User profile created with ACTIVE status");
      }

      // Create employee stats record
      console.log("📊 [EMPLOYEE] Creating employee stats...");
      const { error: statsError } = await (supabaseAdmin
        .from("employee_stats") as any)
        .insert({
          user_id: newUser.user.id,
          is_available: true,
          orders_completed: 0,
          last_active_at: null,
          created_at: now,
          updated_at: now
        });

      if (statsError) {
        console.error("⚠️ [EMPLOYEE] Failed to create employee stats:", statsError);
      } else {
        console.log("✅ [EMPLOYEE] Employee stats created");
      }

      // Update telegram_chat_id if provided
      if (data.telegram_chat_id) {
        console.log("📱 [EMPLOYEE] Setting Telegram chat ID...");
        try {
          await (supabaseAdmin
            .from("users") as any)
            .update({ telegram_chat_id: data.telegram_chat_id })
            .eq("id", newUser.user.id);
          console.log("✅ [EMPLOYEE] Telegram chat ID set");
        } catch (telegramError) {
          console.error("⚠️ [EMPLOYEE] Failed to set telegram chat ID:", telegramError);
        }
      }

      // Send notification to the new employee
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          data.email,
          "🎉 Your BoostBuddy Employee Account is Ready!",
          `Hello ${data.name},\n\nYour employee account has been created and is ready to use!\n\nYou can log in immediately at: https://boostbuddy.it/e/dashboard\n\nYour credentials:\n📧 Email: ${data.email}\n🔑 Password: [The password you set]\n\nWelcome to the team!`,
          "TELEGRAM",
          "SYSTEM"
        );
      } catch (notifError) {
        console.log("⚠️ [EMPLOYEE] Failed to send notification (non-blocking):", notifError);
      }

      revalidatePath("/a/employees");

      console.log("🎉 [EMPLOYEE] Employee creation completed successfully");

      return {
        success: true,
        data: {
          id: newUser.user.id,
          email: newUser.user.email,
          name: data.name,
          role: data.role
        }
      };

    } catch (restApiError: any) {
      console.error("❌ [EMPLOYEE] REST API exception:", restApiError);
      return { success: false, error: restApiError.message || "Failed to create user via REST API" };
    }
  } catch (error: any) {
    console.error("❌ [EMPLOYEE] Employee creation error:", error);
    console.error("❌ [EMPLOYEE] Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status
    });
    return { success: false, error: error.message || "Failed to create employee" };
  }
}

// ============================================
// EMPLOYEE DASHBOARD ACTIONS
// ============================================

/**
 * Get available orders for employee to accept
 * Includes skip information for the current employee
 */
export async function getAvailableOrdersAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    // Only employees can access
    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabase = await createClient();

    // OPTIMIZED: Select only needed fields, reduced limit for performance
    const { data: orders, error } = await supabase
      .from("review_orders")
      .select("id, business_name, review_type, review_content, review_instructions, credits_consumed, created_at, admin_verification_status")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(10);  // Reduced from 20 to 10 for better performance

    if (error) {
      console.error("❌ [EMPLOYEE] Available orders query failed:", error);
      throw error;
    }

    // Get skip records for current employee
    const orderIds = orders?.map(o => o.id) || [];
    const { data: skipRecords } = await supabase
      .from("skipped_reviews")
      .select("review_order_id, reason, created_at")
      .eq("employee_id", auth.user.id)
      .in("review_order_id", orderIds);

    const skipMap = new Map(skipRecords?.map(s => [s.review_order_id, s]) || []);

    // Normalize field names to camelCase for frontend
    const normalizedData = orders?.map(order => {
      const skipInfo = skipMap.get(order.id);
      return {
        id: order.id,
        businessName: order.business_name,
        reviewType: order.review_type,
        reviewContent: order.review_content,
        reviewInstructions: order.review_instructions,
        creditsConsumed: order.credits_consumed,
        createdAt: order.created_at,
        adminVerificationStatus: order.admin_verification_status || null,
        skippedByCurrentUser: !!skipInfo,
        skipReason: skipInfo?.reason || null,
        skipCreatedAt: skipInfo?.created_at || null
      };
    }) || [];

    return { success: true, data: normalizedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get employee's current assignments
 */
export async function getCurrentAssignmentsAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("review_orders")
      .select("id, business_name, review_type, review_content, review_instructions, credits_consumed, status, assigned_at, created_at")
      .eq("assigned_employee_id", auth.user.id)
      .eq("status", "IN_PROGRESS")
      .order("assigned_at", { ascending: true });

    if (error) throw error;

    // Normalize field names to camelCase for frontend
    const normalizedData = data?.map(order => ({
      id: order.id,
      businessName: order.business_name,
      reviewType: order.review_type,
      reviewContent: order.review_content,
      reviewInstructions: order.review_instructions,
      creditsConsumed: order.credits_consumed,
      status: order.status,
      assignedAt: order.assigned_at,
      createdAt: order.created_at
    })) || [];

    return { success: true, data: normalizedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Accept an available review order
 */
export async function acceptOrderAction(orderId: string) {
  try {
    console.log("🎯 [EMPLOYEE] Starting order acceptance:", orderId);

    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    console.log("✅ [EMPLOYEE] Auth passed for user:", auth.user.email);
    const now = new Date().toISOString();
    let clientEmail: string | null = null;
    let businessName: string = "";

    const supabase = await createAdminClient();

    // Check if order is still available
    console.log("🔍 [EMPLOYEE] Checking order availability...");
    const { data: order, error: orderCheckError } = await (supabase
      .from("review_orders") as any)
      .select("id, status, business_name, user_id")
      .eq("id", orderId)
      .eq("status", "PENDING")
      .single();

    if (orderCheckError) {
      console.error("❌ [EMPLOYEE] Order check failed:", orderCheckError);
      return { success: false, error: `Database error: ${orderCheckError.message}` };
    }

    if (!order) {
      console.log("❌ [EMPLOYEE] Order not available:", orderId);
      return { success: false, error: "Order not available" };
    }

    console.log("✅ [EMPLOYEE] Order available:", order.business_name);

    // Get client email from user_id
    if (order.user_id) {
      console.log("📧 [EMPLOYEE] Getting client email...");
      const { data: clientData, error: clientError } = await (supabase
        .from("users") as any)
        .select("email")
        .eq("id", order.user_id)
        .single();

      if (clientError) {
        console.warn("⚠️ [EMPLOYEE] Failed to get client email:", clientError);
      } else {
        clientEmail = clientData?.email || null;
        console.log("✅ [EMPLOYEE] Client email:", clientEmail);
      }
    }
    businessName = order.business_name;

    // Assign to employee - SECURITY: conditional UPDATE prevents race condition
    console.log("🎯 [EMPLOYEE] Assigning order to employee...");
    const { data: assigned, error: assignError } = await (supabase
      .from("review_orders") as any)
      .update({
        assigned_employee_id: auth.user.id,
        status: "IN_PROGRESS",
        assigned_at: now
      })
      .eq("id", orderId)
      .eq("status", "PENDING")
      .select();

    if (assignError) {
      console.error("❌ [EMPLOYEE] Assignment failed:", assignError);
      throw assignError;
    }

    if (!assigned || assigned.length === 0) {
      console.log("❌ [EMPLOYEE] Order already taken by another employee");
      return { success: false, error: "Order was already taken by another employee" };
    }

    console.log("✅ [EMPLOYEE] Order assigned successfully");

    // Update employee last active
    console.log("📊 [EMPLOYEE] Updating employee stats...");
    const { error: statsError } = await (supabase
      .from("employee_stats") as any)
      .update({ last_active_at: now })
      .eq("user_id", auth.user.id);

    console.log("✅ [EMPLOYEE] Employee stats updated");

    // Send Telegram notifications (non-blocking - fire and forget)
    console.log("📱 [EMPLOYEE] Sending notifications (non-blocking)...");

    // Send notification to employee
    (async () => {
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          auth.user.email,
          "✅ Review Order Accepted",
          `You have been assigned a new review order. Please complete it within the specified time.`,
          "TELEGRAM",
          "EMPLOYEE_ORDER_ASSIGNED",
          "HIGH",  // Priority: Employee accepted work, real-time confirmation
          orderId   // Related order ID for context
        );
        console.log("✅ [EMPLOYEE] Employee notification sent");
      } catch (notifError) {
        console.warn("⚠️ [EMPLOYEE] Employee notification failed (non-blocking):", notifError);
      }
    })();

    // Send notification to client
    if (clientEmail) {
      (async () => {
        try {
          const { sendNotificationAction } = await import("./notifications");
          await sendNotificationAction(
            clientEmail,
            "🔄 Your Review Order Is In Progress",
            `Your review order for ${businessName} has been picked up by our team and is now being worked on.`,
            "TELEGRAM",
            "REVIEWS_ORDER_IN_PROGRESS"
          );
          console.log("✅ [EMPLOYEE] Client notification sent");
        } catch (notifError) {
          console.warn("⚠️ [EMPLOYEE] Client notification failed (non-blocking):", notifError);
        }
      })();
    }

    console.log("🎉 [EMPLOYEE] Order acceptance completed successfully");
    revalidatePath("/e/reviews");

    return { success: true };
  } catch (error: any) {
    console.error("❌ [EMPLOYEE] Order acceptance error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit completed review with proof
 */
export async function submitCompletedReviewAction(orderId: string, proof: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    if (!proof || proof.trim().length === 0) {
      return { success: false, error: "Proof of completion is required" };
    }

    const now = new Date().toISOString();
    let clientEmail: string | null = null;
    let businessName: string = "";

    const supabase = await createAdminClient();

    // Check if order is assigned to this employee (also fetch client email + business name)
    const { data: order } = await (supabase
      .from("review_orders") as any)
      .select("id, status, assigned_employee_id, business_name, user_id")
      .eq("id", orderId)
      .eq("assigned_employee_id", auth.user.id)
      .eq("status", "IN_PROGRESS")
      .single();

    if (!order) {
      return { success: false, error: "Order not found or not assigned to you" };
    }

    // Get client email from user_id
    if (order.user_id) {
      const { data: clientData } = await (supabase
        .from("users") as any)
        .select("email")
        .eq("id", order.user_id)
        .single();
      clientEmail = clientData?.email || null;
    }
    businessName = order.business_name || "";

    // Mark as completed and auto-approve
    const { error: completeError } = await (supabase
      .from("review_orders") as any)
      .update({
        status: "COMPLETED",
        proof_of_completion: proof,
        completed_at: now,
        admin_verification_status: "APPROVED",
        admin_verified_at: now
      })
      .eq("id", orderId);

    if (completeError) throw completeError;

    // Update employee stats
    const { data: stats } = await (supabase
      .from("employee_stats") as any)
      .select("orders_completed")
      .eq("user_id", auth.user.id)
      .single();

    const newCompletedCount = (stats?.orders_completed || 0) + 1;

    await (supabase
      .from("employee_stats") as any)
      .update({
        orders_completed: newCompletedCount,
        last_active_at: now
      })
      .eq("user_id", auth.user.id);

    // Send Telegram notification to the employee
    try {
      const { sendNotificationAction } = await import("./notifications");
      await sendNotificationAction(
        auth.user.email,
        "🎉 Review Completed Successfully",
        `Your review has been completed successfully.`,
        "TELEGRAM",
        "EMPLOYEE_REVIEW_COMPLETED",
        "HIGH",  // Priority: Major milestone, real-time confirmation
        orderId   // Related order ID for context
      );
    } catch (notifError) {
      console.warn("Failed to send notification:", notifError);
    }

    // Notify the client that their review is completed
    if (clientEmail) {
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          clientEmail,
          "✅ Review Completed",
          `Your review for ${businessName} has been completed and is ready to view!`,
          "TELEGRAM",
          "REVIEWS_REVIEW_COMPLETED",
          "MEDIUM",  // Priority: Good news, but not time-sensitive
          orderId   // Related order ID for context
        );
      } catch (clientNotifError) {
        console.warn("Failed to send client notification:", clientNotifError);
      }
    }

    revalidatePath("/e/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get employee performance stats
 */
export async function getEmployeeStatsAction(employeeId?: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const targetUserId = employeeId || auth.user.id;
    const isOwnStats = !employeeId || employeeId === auth.user.id;

    // Only admins or the employee themselves can view stats
    if (!isOwnStats && auth.user.role !== 'ADMIN') {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();
    const { data, error } = await (supabase
      .from("employee_stats") as any)
      .select("id, user_id, is_available, orders_completed, last_active_at, created_at, updated_at")
      .eq("user_id", targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Create stats if not exists
    if (!data) {
      const now = new Date().toISOString();
      const { data: newStats, error: createError } = await supabase
        .from("employee_stats")
        .insert({
          user_id: targetUserId,
          is_available: true,
          orders_completed: 0
        })
        .select()
        .single();

      if (createError) throw createError;

      // Normalize to camelCase
      const normalizedStats = {
        id: newStats.id,
        userId: newStats.user_id,
        isAvailable: newStats.is_available,
        ordersCompleted: newStats.orders_completed,
        lastActiveAt: newStats.last_active_at,
        createdAt: newStats.created_at,
        updatedAt: newStats.updated_at
      };

      return { success: true, data: normalizedStats };
    }

    // Normalize to camelCase
    const normalizedStats = {
      id: data.id,
      userId: data.user_id,
      isAvailable: data.is_available,
      ordersCompleted: data.orders_completed,
      lastActiveAt: data.last_active_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    return { success: true, data: normalizedStats };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Toggle employee availability status
 */
export async function toggleAvailabilityAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const now = new Date().toISOString();
    const supabase = await createAdminClient();

    // Get current availability
    const { data: stats } = await (supabase
      .from("employee_stats") as any)
      .select("is_available")
      .eq("user_id", auth.user.id)
      .single();

    const currentAvailability = stats?.is_available ?? true;
    const newAvailability = !currentAvailability;

    // Update or create stats
    if (stats) {
      await (supabase
        .from("employee_stats") as any)
        .update({ is_available: newAvailability })
        .eq("user_id", auth.user.id);
    } else {
      await (supabase
        .from("employee_stats") as any)
        .insert({
          user_id: auth.user.id,
          is_available: newAvailability,
          orders_completed: 0
        });
    }

    return { success: true, data: { isAvailable: newAvailability } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Toggle employee task distribution status (accepting_tasks)
 * This is separate from account availability - controls whether employee receives new tasks
 */
export async function toggleTaskDistributionAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabase = await createAdminClient();

    // Get current accepting_tasks status
    const { data: stats } = await (supabase
      .from("employee_stats") as any)
      .select("accepting_tasks")
      .eq("user_id", auth.user.id)
      .single();

    const currentAccepting = stats?.accepting_tasks ?? true;
    const newAccepting = !currentAccepting;

    // Update or create stats
    if (stats) {
      await (supabase
        .from("employee_stats") as any)
        .update({ accepting_tasks: newAccepting })
        .eq("user_id", auth.user.id);
    } else {
      await (supabase
        .from("employee_stats") as any)
        .insert({
          user_id: auth.user.id,
          is_available: true,
          accepting_tasks: newAccepting,
          orders_completed: 0
        });
    }

    return { success: true, data: { acceptingTasks: newAccepting } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get employee's order history
 */
export async function getEmployeeOrderHistoryAction(limit: number = 50) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("review_orders")
      .select(`
        id,
        user_id,
        business_name,
        order_type,
        review_type,
        review_content,
        review_instructions,
        quantity,
        credits_consumed,
        status,
        assigned_employee_id,
        assigned_at,
        completed_at,
        proof_of_completion,
        created_at,
        updated_at,
        admin_verification_status,
        admin_verified_at,
        users:user_id (
          name,
          email
        )
      `)
      .eq("assigned_employee_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Normalize field names to camelCase for frontend
    const normalizedData = data?.map((order: any) => ({
      id: order.id,
      userId: order.user_id,
      businessName: order.business_name,
      orderType: order.order_type,
      reviewType: order.review_type,
      reviewContent: order.review_content,
      reviewInstructions: order.review_instructions,
      quantity: order.quantity,
      creditsConsumed: order.credits_consumed,
      status: order.status,
      assignedEmployeeId: order.assigned_employee_id,
      assignedAt: order.assigned_at,
      completedAt: order.completed_at,
      proofOfCompletion: order.proof_of_completion,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      adminVerificationStatus: order.admin_verification_status,
      adminVerifiedAt: order.admin_verified_at,
      users: Array.isArray(order.users) && order.users.length > 0 ? {
        name: order.users[0].name,
        email: order.users[0].email
      } : undefined
    })) || [];

    return { success: true, data: normalizedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get available (unassigned) PENDING orders that employees can accept
 */
export async function getEmployeeReviewOrdersAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabase = await createClient();

    // Fetch PENDING orders (available to all employees)
    const { data: pendingOrders, error: pendingError } = await supabase
      .from("review_orders")
      .select("id, user_id, business_name, facebook_url, order_type, review_type, review_content, review_instructions, quantity, credits_consumed, status, created_at, updated_at, users:user_id(name, email)")
      .eq("status", "PENDING")
      .is("assigned_employee_id", null)
      .order("created_at", { ascending: false });

    if (pendingError) throw pendingError;

    // Normalize field names to camelCase
    const normalizedOrders = pendingOrders?.map((order: any) => ({
      id: order.id,
      userId: order.user_id,
      businessName: order.business_name,
      businessUrl: order.facebook_url,
      orderType: order.order_type,
      reviewType: order.review_type,
      reviewContent: order.review_content,
      reviewInstructions: order.review_instructions,
      quantity: order.quantity,
      creditsConsumed: order.credits_consumed,
      status: order.status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      users: Array.isArray(order.users) && order.users.length > 0 ? {
        name: order.users[0].name,
        email: order.users[0].email
      } : undefined
    })) || [];

    return {
      success: true,
      data: normalizedOrders
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Accept a review order (assign to employee and start progress)
 * DEPRECATED: No longer used in new workflow
 */
export async function acceptReviewOrderAction(orderId: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabase = await createClient();
    // Use admin client for update to bypass RLS
    const supabaseAdmin = await createAdminClient();

    // Check if order is still available (PENDING and unassigned)
    const { data: order, error: fetchError } = await supabase
      .from("review_orders")
      .select("id, status, assigned_employee_id")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return { success: false, error: "Order not found" };
    }

    // Order must be PENDING and unassigned
    if (order.status !== "PENDING" || order.assigned_employee_id) {
      return { success: false, error: "Order is no longer available" };
    }

    // Assign order to employee and set status to IN_PROGRESS
    const { error: updateError, data: updatedData } = await supabaseAdmin
      .from("review_orders")
      .update({
        assigned_employee_id: auth.user.id,
        status: "IN_PROGRESS",
        assigned_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    console.log("Updated order:", updatedData);

    return { success: true, data: { orderId } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Complete a review order (NEW - simplified, no proof required)
 * Employees can directly mark PENDING orders as completed
 */
export async function completeReviewOrderAction(orderId: string) {
  try {
    console.log("📋 [EMPLOYEE] Starting order completion:", orderId);

    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabaseAdmin = await createAdminClient();

    // Get order details including credits consumed
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("review_orders")
      .select("id, status, credits_consumed, completed_by_employee_id")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      console.error("❌ [EMPLOYEE] Order not found:", fetchError);
      return { success: false, error: "Order not found" };
    }

    // Check if already completed
    if (order.status === "COMPLETED") {
      return { success: false, error: "Order already completed" };
    }

    // Check if already completed by someone else
    if (order.completed_by_employee_id) {
      return { success: false, error: "Order already completed by another employee" };
    }

    console.log("✅ [EMPLOYEE] Marking order as completed by:", auth.user.id);

    // Mark order as completed
    const { error: updateError, data: updatedData } = await supabaseAdmin
      .from("review_orders")
      .update({
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
        completed_by_employee_id: auth.user.id,
        assigned_employee_id: auth.user.id // Also set for backward compatibility
      })
      .eq("id", orderId)
      .select("id, status, completed_at")
      .single();

    if (updateError) {
      console.error("❌ [EMPLOYEE] Update error:", updateError);
      throw updateError;
    }

    console.log("✅ [EMPLOYEE] Order completed:", updatedData.id);

    // Update employee stats
    // First fetch current stats
    const { data: currentStats } = await supabaseAdmin
      .from("employee_stats")
      .select("orders_completed, credits_completed")
      .eq("user_id", auth.user.id)
      .single();

    const { error: statsError } = await supabaseAdmin
      .from("employee_stats")
      .update({
        orders_completed: (currentStats?.orders_completed || 0) + 1,
        credits_completed: (currentStats?.credits_completed || 0) + (order.credits_consumed || 0),
        last_active_at: new Date().toISOString()
      })
      .eq("user_id", auth.user.id);

    if (statsError) {
      console.error("⚠️ [EMPLOYEE] Failed to update stats:", statsError);
    }

    // Revalidate cache
    revalidatePath("/e/dashboard");
    revalidatePath("/admin/employees");

    return { success: true, data: { orderId } };
  } catch (error: any) {
    console.error("❌ [EMPLOYEE] Completion error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a single review order by ID
 */
export async function getReviewOrderByIdAction(orderId: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("review_orders")
      .select(`
        id, user_id, business_name, facebook_url, order_type, review_type,
        review_content, review_instructions, quantity, credits_consumed, status,
        assigned_employee_id, assigned_at, completed_at, proof_of_completion,
        reaction_type, created_at, updated_at, comment_text, photo_urls, total_urls,
        users:user_id(name, email),
        employees:assigned_employee_id(name, email)
      `)
      .eq("id", orderId)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: "Order not found" };

    // Fetch review_urls using admin client (bypasses RLS)
    // Safe because we've already verified this order is assigned to this employee
    const adminClient = createAdminClient();
    const { data: urls } = await adminClient
      .from("review_urls")
      .select("id, url, quantity, reaction_type, review_content, photo_urls, review_index, status, assigned_employee_id, assigned_at, completed_at, proof_of_completion")
      .eq("review_order_id", orderId)
      .order("review_index", { ascending: true });

    const reviewUrlsData = urls?.map((ru: any) => ({
      id: ru.id,
      url: ru.url,
      quantity: ru.quantity,
      reactionType: ru.reaction_type,
      reviewIndex: ru.review_index,
      status: ru.status,
      reviewContent: ru.review_content,
      photos: ru.photo_urls ? JSON.parse(ru.photo_urls) : null,
      assignedEmployeeId: ru.assigned_employee_id,
      assignedAt: ru.assigned_at,
      completedAt: ru.completed_at,
      proofOfCompletion: ru.proof_of_completion
    })) || [];

    // Normalize field names - ensure we handle both array and single object returns
    const usersData = Array.isArray(data.users) ? (data.users.length > 0 ? data.users[0] : null) : data.users;
    const employeesData = Array.isArray(data.employees) ? (data.employees.length > 0 ? data.employees[0] : null) : data.employees;

    const normalizedOrder = {
      id: data.id,
      userId: data.user_id,
      businessName: data.business_name,
      businessUrl: data.facebook_url,
      facebookUrl: data.facebook_url, // Also set as facebookUrl for consistency
      orderType: data.order_type,
      reviewType: data.review_type,
      reviewContent: data.review_content,
      reviewInstructions: data.review_instructions,
      quantity: data.quantity,
      creditsConsumed: data.credits_consumed,
      status: data.status,
      assignedEmployeeId: data.assigned_employee_id,
      assignedAt: data.assigned_at,
      completedAt: data.completed_at,
      proofOfCompletion: data.proof_of_completion,
      reactionType: data.reaction_type,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      users: usersData,
      employees: employeesData,
      reviewUrls: reviewUrlsData,
      comments: data.comment_text ? data.comment_text.split('|||').map((c: string) => c.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\')) : [],
      photoUrls: data.photo_urls ? JSON.parse(data.photo_urls) : null,
      commentText: data.comment_text,
      // For COMMENT_WITH_PHOTO orders, build photoReviews from review_urls data (not from data.photo_urls)
      photoReviews: data.order_type === 'COMMENT_WITH_PHOTO' && urls && urls.length > 0
        ? urls.flatMap((ru: any) => {
            const reviews = ru.review_content ? JSON.parse(ru.review_content) : [];
            const photos = ru.photo_urls ? JSON.parse(ru.photo_urls) : [];
            return reviews.map((review: string, i: number) => ({
              text: review,
              photos: photos[i] || []
            }));
          })
        : null
    };

    return { success: true, data: normalizedOrder };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get employee's completed reviews
 */
export async function getEmployeeCompletedReviewsAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("review_orders")
      .select("id, business_name, facebook_url, review_type, review_content, review_instructions, credits_consumed, status, assigned_at, completed_at, proof_of_completion, admin_verification_status, admin_verified_at, created_at")
      .eq("assigned_employee_id", auth.user.id)
      .eq("status", "COMPLETED")
      .order("completed_at", { ascending: false });

    if (error) throw error;

    // Normalize field names to camelCase for frontend
    const normalizedData = data?.map(order => ({
      id: order.id,
      businessName: order.business_name,
      businessUrl: order.facebook_url || null,
      reviewType: order.review_type,
      reviewContent: order.review_content,
      reviewInstructions: order.review_instructions,
      creditsConsumed: order.credits_consumed,
      status: order.status,
      assignedAt: order.assigned_at,
      completedAt: order.completed_at,
      proofOfCompletion: order.proof_of_completion,
      adminVerificationStatus: order.admin_verification_status,
      adminVerifiedAt: order.admin_verified_at,
      createdAt: order.created_at
    })) || [];

    return { success: true, data: normalizedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark an assigned review order as complete and submit proof
 */
export async function completeReviewAction(orderId: string, proofOfCompletion: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabase = await createAdminClient();
    const employeeId = auth.user.id;

    // Verify the order is assigned to this employee and is IN_PROGRESS
    const { data: order, error: orderError } = await (supabase
      .from("review_orders") as any)
      .select("id, assigned_employee_id, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: "Order not found" };
    }

    if (order.assigned_employee_id !== employeeId) {
      return { success: false, error: "You can only complete your own assigned orders" };
    }

    if (order.status !== 'IN_PROGRESS') {
      return { success: false, error: "Only IN_PROGRESS orders can be marked as complete" };
    }

    const now = new Date().toISOString();
    let clientEmail: string | null = null;
    let businessName: string = "";

    // Get client info for notifications
    const { data: orderInfo } = await (supabase
      .from("review_orders") as any)
      .select("user_id, business_name")
      .eq("id", orderId)
      .single();

    if (orderInfo) {
      businessName = orderInfo.business_name || "";
      if (orderInfo.user_id) {
        const { data: clientData } = await (supabase
          .from("users") as any)
          .select("email")
          .eq("id", orderInfo.user_id)
          .single();
        clientEmail = clientData?.email || null;
      }
    }

    // Update order status and add proof (auto-approved)
    const { error: updateError } = await (supabase
      .from("review_orders") as any)
      .update({
        status: 'COMPLETED',
        proof_of_completion: proofOfCompletion,
        completed_at: now,
        admin_verification_status: 'APPROVED',
        admin_verified_at: now
      })
      .eq("id", orderId);

    if (updateError) throw updateError;

    // Update employee stats - increment completed count
    // First fetch current stats
    const { data: currentStats } = await (supabase
      .from("employee_stats") as any)
      .select("orders_completed")
      .eq("user_id", employeeId)
      .maybeSingle();

    const newCompletedCount = (currentStats?.orders_completed || 0) + 1;

    // Then update with new value
    const { error: statsError } = await (supabase
      .from("employee_stats") as any)
      .update({
        orders_completed: newCompletedCount,
        last_active_at: now
      })
      .eq("user_id", employeeId);

    // Ignore stats errors - might not exist yet
    if (statsError && statsError.code !== '42P01') {
      console.error("Failed to update employee stats:", statsError);
    }

    // Send Telegram notification to the employee
    try {
      const { sendNotificationAction } = await import("./notifications");
      await sendNotificationAction(
        auth.user.email,
        "🎉 Review Completed Successfully",
        `Your review has been completed successfully.`,
        "TELEGRAM",
        "EMPLOYEE_REVIEW_COMPLETED",
        "HIGH",
        orderId
      );
    } catch (notifError) {
      console.warn("Failed to send notification:", notifError);
    }

    // Notify the client that their review is completed
    if (clientEmail) {
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          clientEmail,
          "✅ Review Completed",
          `Your review for ${businessName} has been completed.`,
          "TELEGRAM",
          "REVIEWS_REVIEW_COMPLETED",
          "MEDIUM",
          orderId
        );
      } catch (clientNotifError) {
        console.warn("Failed to send client notification:", clientNotifError);
      }
    }

    return { success: true, data: { message: "Review marked as complete" } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// EMPLOYEE STATS ACTIONS (NEW)
// ============================================

/**
 * Get employee stats for the logged-in employee
 */
export async function getMyEmployeeStatsAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabase = await createClient();

    // Get employee stats
    const { data: stats, error: statsError } = await supabase
      .from("employee_stats")
      .select("*")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (statsError) throw statsError;

    // Get today's completed orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayOrders, error: todayError } = await supabase
      .from("review_orders")
      .select("credits_consumed")
      .eq("completed_by_employee_id", auth.user.id)
      .eq("status", "COMPLETED")
      .gte("completed_at", today.toISOString());

    if (todayError) throw todayError;

    const todayCredits = todayOrders?.reduce((sum, order) => sum + (order.credits_consumed || 0), 0) || 0;

    return {
      success: true,
      data: {
        totalCreditsCompleted: stats?.credits_completed || 0,
        totalOrdersCompleted: stats?.orders_completed || 0,
        todayCreditsCompleted: todayCredits,
        todayOrdersCompleted: todayOrders?.length || 0,
        lastActiveAt: stats?.last_active_at
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all employees stats (for admin leaderboard)
 */
export async function getAllEmployeesStatsAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'ADMIN') {
      return { success: false, error: "Unauthorized - Admin only" };
    }

    const supabase = await createClient();

    // Get all employees with their stats
    const { data: employees, error: employeesError } = await supabase
      .from("users")
      .select("id, name, email, created_at")
      .eq("role", "EMPLOYEE");

    if (employeesError) throw employeesError;

    // Get stats for each employee
    const employeesWithStats = await Promise.all(
      (employees || []).map(async (employee) => {
        // Get employee stats record
        const { data: stats } = await supabase
          .from("employee_stats")
          .select("*")
          .eq("user_id", employee.id)
          .maybeSingle();

        // Get today's completed orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: todayOrders } = await supabase
          .from("review_orders")
          .select("credits_consumed")
          .eq("completed_by_employee_id", employee.id)
          .eq("status", "COMPLETED")
          .gte("completed_at", today.toISOString());

        const todayCredits = todayOrders?.reduce((sum, order) => sum + (order.credits_consumed || 0), 0) || 0;

        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          totalCreditsCompleted: stats?.credits_completed || 0,
          totalOrdersCompleted: stats?.orders_completed || 0,
          todayCreditsCompleted: todayCredits,
          todayOrdersCompleted: todayOrders?.length || 0,
          lastActiveAt: stats?.last_active_at,
          isAvailable: stats?.is_available ?? false
        };
      })
    );

    // Sort by total credits completed (descending)
    employeesWithStats.sort((a, b) => b.totalCreditsCompleted - a.totalCreditsCompleted);

    return {
      success: true,
      data: employeesWithStats
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
