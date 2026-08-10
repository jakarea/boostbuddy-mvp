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
  ordersSkipped: number;
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
          orders_skipped: 0,
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
      .select("id, business_name, review_type, target_rating, review_content, review_instructions, credits_consumed, created_at, rejection_reason, admin_verification_status")
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

    // Normalize field names to camelCase for frontend and add skip/rejection info
    const normalizedData = orders?.map(order => {
      const skipInfo = skipMap.get(order.id);
      return {
        id: order.id,
        businessName: order.business_name,
        reviewType: order.review_type,
        targetRating: order.target_rating,
        reviewContent: order.review_content,
        reviewInstructions: order.review_instructions,
        creditsConsumed: order.credits_consumed,
        createdAt: order.created_at,
        rejectionReason: order.rejection_reason || null,
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
      .select("id, business_name, review_type, target_rating, review_content, review_instructions, credits_consumed, status, assigned_at, created_at")
      .eq("assigned_employee_id", auth.user.id)
      .eq("status", "IN_PROGRESS")
      .order("assigned_at", { ascending: true });

    if (error) throw error;

    // Normalize field names to camelCase for frontend
    const normalizedData = data?.map(order => ({
      id: order.id,
      businessName: order.business_name,
      reviewType: order.review_type,
      targetRating: order.target_rating,
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
      .select("id, user_id, is_available, orders_completed, orders_skipped, last_active_at, created_at, updated_at")
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
          orders_completed: 0,
          orders_skipped: 0
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
        ordersSkipped: newStats.orders_skipped,
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
      ordersSkipped: data.orders_skipped,
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
          orders_completed: 0,
          orders_skipped: 0
        });
    }

    return { success: true, data: { isAvailable: newAvailability } };
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
      .select("id, business_name, review_type, target_rating, credits_consumed, status, assigned_at, completed_at, proof_of_completion, created_at, admin_verification_status, admin_verified_at")
      .eq("assigned_employee_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Normalize field names to camelCase for frontend
    const normalizedData = data?.map(order => ({
      id: order.id,
      businessName: order.business_name,
      reviewType: order.review_type,
      targetRating: order.target_rating,
      creditsConsumed: order.credits_consumed,
      status: order.status,
      assignedAt: order.assigned_at,
      completedAt: order.completed_at,
      proofOfCompletion: order.proof_of_completion,
      createdAt: order.created_at,
      adminVerificationStatus: order.admin_verification_status,
      adminVerifiedAt: order.admin_verified_at
    })) || [];

    return { success: true, data: normalizedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get employee's reviews by admin verification status
 */
export async function getEmployeeReviewsByStatusAction(verificationStatus: "APPROVED" | "REJECTED") {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("review_orders")
      .select("id, business_name, review_type, target_rating, credits_consumed, status, assigned_at, completed_at, proof_of_completion, created_at, admin_verification_status, admin_verified_at")
      .eq("assigned_employee_id", auth.user.id)
      .eq("status", "COMPLETED")
      .eq("admin_verification_status", verificationStatus)
      .order("completed_at", { ascending: false });

    if (error) throw error;

    // Normalize field names to camelCase for frontend
    const normalizedData = data?.map(order => ({
      id: order.id,
      businessName: order.business_name,
      reviewType: order.review_type,
      targetRating: order.target_rating,
      creditsConsumed: order.credits_consumed,
      status: order.status,
      assignedAt: order.assigned_at,
      completedAt: order.completed_at,
      proofOfCompletion: order.proof_of_completion,
      createdAt: order.created_at,
      adminVerificationStatus: order.admin_verification_status,
      adminVerifiedAt: order.admin_verified_at
    })) || [];

    return { success: true, data: normalizedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all review orders visible to employee:
 * - All PENDING orders (available to accept)
 * - Their own IN_PROGRESS, COMPLETED, CANCELLED orders
 * - Includes skip information and verification status
 */
export async function getEmployeeReviewOrdersAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabase = await createClient();
    const employeeId = auth.user.id;

    // Fetch employee stats
    const { data: stats, error: statsError } = await supabase
      .from("employee_stats")
      .select("is_available, orders_completed, orders_skipped")
      .eq("user_id", employeeId)
      .maybeSingle();

    if (statsError) throw statsError;

    // Fetch PENDING orders (available to all employees)
    const { data: pendingOrders, error: pendingError } = await supabase
      .from("review_orders")
      .select("id, business_name, business_url, review_type, target_rating, review_content, review_instructions, credits_consumed, status, created_at")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true });

    if (pendingError) throw pendingError;

    // Fetch employee's own assigned orders (IN_PROGRESS, COMPLETED, CANCELLED)
    const { data: assignedOrders, error: assignedError } = await supabase
      .from("review_orders")
      .select("id, business_name, business_url, review_type, target_rating, review_content, review_instructions, credits_consumed, status, created_at, updated_at, completed_at, assigned_at, proof_of_completion, admin_verification_status, rejection_reason")
      .eq("assigned_employee_id", employeeId)
      .in("status", ["IN_PROGRESS", "COMPLETED", "CANCELLED"])
      .order("created_at", { ascending: false });

    if (assignedError) throw assignedError;

    // Get skip information for all orders
    const allOrders = [...(pendingOrders || []), ...(assignedOrders || [])];
    const orderIds = allOrders.map(o => o.id);

    let skipsMap = new Map<string, any[]>();

    if (orderIds.length > 0) {
      const { data: skips } = await supabase
        .from("skipped_reviews")
        .select("review_order_id, employee_id, reason, created_at, users:employee_id(name)")
        .in("review_order_id", orderIds);

      for (const skip of skips || []) {
        if (!skipsMap.has(skip.review_order_id)) {
          skipsMap.set(skip.review_order_id, []);
        }
        const skipsList = skipsMap.get(skip.review_order_id);
        if (skipsList) {
          skipsList.push({
            employeeId: skip.employee_id,
            employeeName: (skip.users as any)?.name || null,
            reason: skip.reason,
            createdAt: skip.created_at
          });
        }
      }
    }

    // Combine orders with skip information
    const ordersWithSkips = allOrders.map(order => ({
      ...order,
      skips: skipsMap.get(order.id) || []
    }));

    // Return employee stats and orders
    const employeeStats = stats || {
      is_available: true,
      orders_completed: 0,
      orders_skipped: 0
    };

    return {
      success: true,
      data: {
        stats: employeeStats,
        orders: ordersWithSkips
      }
    };
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
