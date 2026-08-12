"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server-auth";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// ============================================
// TYPES
// ============================================

export type ReviewUrlData = {
  url: string;
  quantity: number;
  reviewContent?: string;
  photos?: string[]; // For COMMENT_WITH_PHOTO type
  reactionType?: "LIKE" | "LOVE" | "CARE" | "HAHA" | "WOW" | "SAD" | "ANGRY";
};

export type MultiUrlReviewOrderData = {
  orderType: "REVIEW" | "COMMENT" | "COMMENT_WITH_PHOTO";
  urls: ReviewUrlData[];
  businessName?: string;
};

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Create a new review order with multiple URLs
 * Each URL becomes a separate task that can be assigned to employees
 */
export async function createMultiUrlReviewOrderAction(orderData: MultiUrlReviewOrderData) {
  console.log("📍 [MULTI-URL ORDER] Starting multi-URL order creation...");

  try {
    const auth = await requireAuth();
    if (!auth.success) {
      console.error("❌ [MULTI-URL ORDER] Auth failed:", auth);
      return auth;
    }

    console.log("✅ [MULTI-URL ORDER] Auth passed, validating data...");

    // Validate order data
    if (!orderData.urls || orderData.urls.length === 0) {
      return { success: false, error: "At least one URL is required" };
    }

    if (orderData.urls.length > 50) {
      return { success: false, error: "Maximum 50 URLs allowed per order" };
    }

    // Validate each URL
    const validOrderTypes = ["REVIEW", "COMMENT", "COMMENT_WITH_PHOTO"] as const;
    if (!validOrderTypes.includes(orderData.orderType)) {
      return { success: false, error: "Invalid order type" };
    }

    // Validate URLs and calculate total quantity
    let totalQuantity = 0;
    for (const urlData of orderData.urls) {
      // Validate Facebook URL
      const facebookUrlRegex = /^https?:\/\/(www\.)?(facebook|fb)\.com\/.+/i;
      if (!facebookUrlRegex.test(urlData.url.trim())) {
        return { success: false, error: `Invalid Facebook URL: ${urlData.url}` };
      }

      // Validate quantity
      if (urlData.quantity < 1 || urlData.quantity > 100) {
        return { success: false, error: `Quantity must be between 1 and 100 for URL: ${urlData.url}` };
      }

      totalQuantity += urlData.quantity;

      // Validate review content for REVIEW types
      if (orderData.orderType === "REVIEW" || orderData.orderType === "COMMENT_WITH_PHOTO") {
        if (!urlData.reviewContent || urlData.reviewContent.trim().length === 0) {
          return { success: false, error: `Review content required for URL: ${urlData.url}` };
        }
        if (urlData.reviewContent.length > 500) {
          return { success: false, error: `Review content must be less than 500 characters for URL: ${urlData.url}` };
        }
      }

      // Validate photos for COMMENT_WITH_PHOTO
      if (orderData.orderType === "COMMENT_WITH_PHOTO") {
        if (!urlData.photos || urlData.photos.length === 0) {
          return { success: false, error: `Photo required for URL: ${urlData.url}` };
        }
        if (urlData.photos.length > 1) {
          return { success: false, error: `Maximum 1 photo per URL for URL: ${urlData.url}` };
        }
      }
    }

    if (totalQuantity > 500) {
      return { success: false, error: "Total quantity across all URLs cannot exceed 500" };
    }

    console.log("✅ [MULTI-URL ORDER] Validation passed, total quantity:", totalQuantity);

    // Calculate credit cost
    const supabase = await createClient();
    const { data: pricing } = await supabase
      .from("review_credit_pricing")
      .select("credits_per_unit")
      .eq("order_type", orderData.orderType)
      .eq("is_active", true)
      .single();

    if (!pricing) {
      return { success: false, error: "No pricing found for this order type" };
    }

    const creditsPerUnit = pricing.credits_per_unit;
    const requiredCredits = creditsPerUnit * totalQuantity;

    // Check user balance
    const { data: user } = await supabase
      .from("users")
      .select("credits_balance")
      .eq("id", auth.user.id)
      .single();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const currentBalance = user.credits_balance || 0;
    if (currentBalance < requiredCredits) {
      return {
        success: false,
        error: `Insufficient credits. Required: ${requiredCredits}, Current: ${currentBalance}`
      };
    }

    console.log("💰 [MULTI-URL ORDER] Credits validated, deducting:", requiredCredits);

    // Create order
    const supabaseAdmin = await createAdminClient();
    const orderId = randomUUID();
    const now = new Date().toISOString();

    // Deduct credits with optimistic concurrency
    const { data: deducted, error: deductError } = await (supabaseAdmin as any)
      .from("users")
      .update({ credits_balance: currentBalance - requiredCredits })
      .eq("id", auth.user.id)
      .eq("credits_balance", currentBalance)
      .select();

    if (deductError) throw deductError;
    if (!deducted || deducted.length === 0) {
      return { success: false, error: "Credit balance changed. Please try again." };
    }

    // Generate business name if not provided
    const businessName = orderData.businessName || extractBusinessNameFromUrl(orderData.urls[0].url);

    // Create ReviewOrder
    const { error: orderError } = await (supabaseAdmin as any)
      .from("review_orders")
      .insert({
        id: orderId,
        user_id: auth.user.id,
        business_name: businessName,
        review_type: "FACEBOOK",
        order_type: orderData.orderType,
        quantity: totalQuantity,
        target_rating: "5_STAR",
        reaction_type: orderData.urls[0].reactionType || "LIKE",
        credits_consumed: requiredCredits,
        status: "PENDING",
        total_urls: orderData.urls.length,
        created_at: now,
        updated_at: now
      });

    if (orderError) throw orderError;

    // Create ReviewUrl entries
    const reviewUrlsData = orderData.urls.map((urlData, index) => ({
      id: randomUUID(),
      review_order_id: orderId,
      url: urlData.url.trim(),
      quantity: urlData.quantity,
      review_content: urlData.reviewContent || null,
      review_index: index,
      status: "PENDING",
      created_at: now,
      updated_at: now
    }));

    const { error: urlsError } = await (supabaseAdmin as any)
      .from("review_urls")
      .insert(reviewUrlsData);

    if (urlsError) throw urlsError;

    // Create credit transaction
    await (supabaseAdmin as any).from("credit_transactions").insert({
      id: randomUUID(),
      user_id: auth.user.id,
      amount: -requiredCredits,
      balance_after: currentBalance - requiredCredits,
      type: "SPEND",
      description: `${orderData.orderType} order (${totalQuantity} reviews across ${orderData.urls.length} URLs)`,
      reference_id: orderId,
      created_at: now
    });

    console.log("✅ [MULTI-URL ORDER] Order created successfully");

    // Send notifications (fire and forget)
    (async () => {
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          auth.user.email,
          `📝 New ${orderData.orderType} Order Created`,
          `Your ${orderData.orderType.toLowerCase()} order for ${totalQuantity} review${totalQuantity > 1 ? 's' : ''} across ${orderData.urls.length} URL${orderData.urls.length > 1 ? 's' : ''} has been created. ${requiredCredits} credits have been deducted.`,
          "TELEGRAM",
          "REVIEWS_ORDER_CREATED",
          "MEDIUM",
          orderId
        );
      } catch (notifError) {
        console.warn("Failed to send notification:", notifError);
      }
    })();

    // Broadcast to employees
    (async () => {
      try {
        const { broadcastToEmployeesAction } = await import("./notifications");
        await broadcastToEmployeesAction(
          `🔔 New ${orderData.orderType} Order Available`,
          `A new ${orderData.orderType.toLowerCase()} order for ${totalQuantity} review${totalQuantity > 1 ? 's' : ''} across ${orderData.urls.length} URL${orderData.urls.length > 1 ? 's' : ''} is ready to process.`,
          "EMPLOYEE_NEW_ORDER_AVAILABLE",
          "HIGH",
          orderId
        );
      } catch (broadcastError) {
        console.warn("Failed to broadcast to employees:", broadcastError);
      }
    })();

    // Revalidate paths
    revalidatePath("/c/services/reviews/orders");
    revalidatePath("/wallet");

    console.log("🎉 [MULTI-URL ORDER] Order creation completed successfully");

    return {
      success: true,
      orderId,
      creditsConsumed: requiredCredits,
      newBalance: currentBalance - requiredCredits
    };
  } catch (error: any) {
    console.error("❌ [MULTI-URL ORDER] Error:", error);
    return { success: false, error: error.message || "Failed to create order" };
  }
}

/**
 * Get available URL tasks for employees to accept
 */
export async function getAvailableUrlTasksAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabaseAdmin = await createAdminClient();

    // Check if employee is accepting tasks
    const { data: stats } = await supabaseAdmin
      .from("employee_stats")
      .select("accepting_tasks")
      .eq("user_id", auth.user.id)
      .single();

    if (!stats?.accepting_tasks) {
      return { success: true, data: [] };
    }

    // Get PENDING URL tasks
    const { data: tasks, error } = await supabaseAdmin
      .from("review_urls")
      .select(`
        id,
        url,
        quantity,
        review_content,
        review_index,
        status,
        review_order_id,
        review_orders (
          id,
          order_type,
          reaction_type,
          business_name
        )
      `)
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) throw error;

    // Normalize data
    const normalizedTasks = tasks?.map((task: any) => ({
      id: task.id,
      url: task.url,
      quantity: task.quantity,
      reviewContent: task.review_content,
      reviewIndex: task.review_index,
      status: task.status,
      reviewOrderId: task.review_order_id,
      orderType: task.review_orders?.order_type,
      reactionType: task.review_orders?.reaction_type,
      businessName: task.review_orders?.business_name
    })) || [];

    return { success: true, data: normalizedTasks };
  } catch (error: any) {
    console.error("❌ [AVAILABLE URL TASKS] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all URL tasks for a specific review order
 * For employee order detail page to show all URLs in an order
 */
export async function getOrderUrlTasksAction(orderId: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabaseAdmin = await createAdminClient();

    // First, verify the order exists and check permissions
    const { data: order, error: orderError } = await supabaseAdmin
      .from("review_orders")
      .select("id, user_id, business_name, order_type")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: "Order not found" };
    }

    // Check permissions: ADMIN can see all, CLIENT can see own, EMPLOYEE can see assigned
    const canAccess =
      auth.user.role === 'ADMIN' ||
      (auth.user.role === 'CLIENT' && order.user_id === auth.user.id) ||
      auth.user.role === 'EMPLOYEE';

    if (!canAccess) {
      return { success: false, error: "Unauthorized" };
    }

    // Get all URL tasks for this order
    const { data: urlTasks, error: tasksError } = await supabaseAdmin
      .from("review_urls")
      .select(`
        id,
        url,
        quantity,
        review_content,
        photos,
        reaction_type,
        review_index,
        status,
        assigned_employee_id,
        assigned_at,
        completed_at,
        proof_of_completion,
        created_at
      `)
      .eq("review_order_id", orderId)
      .order("review_index", { ascending: true });

    if (tasksError) throw tasksError;

    // For employees, only show tasks assigned to them or pending
    let filteredTasks = urlTasks || [];
    if (auth.user.role === 'EMPLOYEE') {
      filteredTasks = filteredTasks.filter((task: any) =>
        task.assigned_employee_id === auth.user.id || task.status === 'PENDING'
      );
    }

    // Normalize data
    const normalizedTasks = filteredTasks.map((task: any) => ({
      id: task.id,
      url: task.url,
      quantity: task.quantity,
      reviewContent: task.review_content,
      photos: task.photos,
      reactionType: task.reaction_type,
      reviewIndex: task.review_index,
      status: task.status,
      assignedEmployeeId: task.assigned_employee_id,
      assignedAt: task.assigned_at,
      completedAt: task.completed_at,
      proofOfCompletion: task.proof_of_completion,
      createdAt: task.created_at
    }));

    return {
      success: true,
      data: {
        orderId: order.id,
        businessName: order.business_name,
        orderType: order.order_type,
        urlTasks: normalizedTasks
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Employee accepts a specific URL task
 */
export async function acceptUrlTaskAction(urlTaskId: string) {
  try {
    console.log("🎯 [URL TASK] Employee accepting URL task:", urlTaskId);

    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabaseAdmin = await createAdminClient();
    const now = new Date().toISOString();

    // Check if task is still available
    const { data: task, error: taskCheckError } = await (supabaseAdmin as any)
      .from("review_urls")
      .select("id, status, review_order_id, review_orders!inner(user_id)")
      .eq("id", urlTaskId)
      .eq("status", "PENDING")
      .single();

    if (taskCheckError) {
      console.error("❌ [URL TASK] Task check failed:", taskCheckError);
      return { success: false, error: `Database error: ${taskCheckError.message}` };
    }

    if (!task) {
      console.log("❌ [URL TASK] Task not available:", urlTaskId);
      return { success: false, error: "Task not available" };
    }

    // Get client email for notification
    const clientUserId = task.review_orders?.user_id;
    let clientEmail = null;
    if (clientUserId) {
      const { data: clientData } = await (supabaseAdmin as any)
        .from("users")
        .select("email")
        .eq("id", clientUserId)
        .single();
      clientEmail = clientData?.email || null;
    }

    console.log("✅ [URL TASK] Task available, assigning to employee:", auth.user.email);

    // Assign to employee with conditional UPDATE (prevents race condition)
    const { data: assigned, error: assignError } = await (supabaseAdmin as any)
      .from("review_urls")
      .update({
        assigned_employee_id: auth.user.id,
        status: "ASSIGNED",
        assigned_at: now
      })
      .eq("id", urlTaskId)
      .eq("status", "PENDING")
      .select();

    if (assignError) throw assignError;

    if (!assigned || assigned.length === 0) {
      console.log("❌ [URL TASK] Task already taken by another employee");
      return { success: false, error: "Task was already taken by another employee" };
    }

    // Update employee stats
    await (supabaseAdmin as any)
      .from("employee_stats")
      .update({ last_active_at: now })
      .eq("user_id", auth.user.id);

    // Update parent order status if this is the first assigned URL
    const { data: allUrls } = await (supabaseAdmin as any)
      .from("review_urls")
      .select("status")
      .eq("review_order_id", task.review_order_id);

    const hasInProgress = allUrls?.some((u: any) => u.status === "ASSIGNED" || u.status === "COMPLETED");
    if (hasInProgress) {
      await (supabaseAdmin as any)
        .from("review_orders")
        .update({ status: "IN_PROGRESS" })
        .eq("id", task.review_order_id);
    }

    console.log("✅ [URL TASK] Task assigned successfully");

    // Send notifications (fire and forget)
    (async () => {
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          auth.user.email,
          "✅ Review Task Assigned",
          "You have been assigned a new review task. Check your dashboard for details.",
          "TELEGRAM",
          "EMPLOYEE_ORDER_ASSIGNED",
          "HIGH",
          urlTaskId
        );
      } catch (notifError) {
        console.warn("Failed to send notification:", notifError);
      }
    })();

    if (clientEmail) {
      (async () => {
        try {
          const { sendNotificationAction } = await import("./notifications");
          await sendNotificationAction(
            clientEmail,
            "🔄 Your Review Order Is In Progress",
            "A review task from your order has been picked up and is being worked on.",
            "TELEGRAM",
            "REVIEWS_ORDER_IN_PROGRESS",
            "MEDIUM",
            urlTaskId
          );
        } catch (notifError) {
          console.warn("Failed to send notification:", notifError);
        }
      })();
    }

    revalidatePath("/e/dashboard");
    revalidatePath("/e/orders");

    console.log("🎉 [URL TASK] Task acceptance completed successfully");

    return { success: true };
  } catch (error: any) {
    console.error("❌ [URL TASK] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get URL task details for employee
 */
export async function getUrlTaskDetailAction(urlTaskId: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();

    const { data: task, error } = await supabase
      .from("review_urls")
      .select(`
        *,
        review_orders (
          *,
          users:user_id (email, name)
        )
      `)
      .eq("id", urlTaskId)
      .single();

    if (error) throw error;
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    // Check permissions
    if (auth.user.role === 'EMPLOYEE' && task.assigned_employee_id !== auth.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Normalize data
    const normalizedTask = {
      ...task,
      reviewContent: task.review_content,
      reviewIndex: task.review_index,
      assignedEmployeeId: task.assigned_employee_id,
      assignedAt: task.assigned_at,
      completedAt: task.completed_at,
      proofOfCompletion: task.proof_of_completion,
      reviewOrder: {
        ...task.review_orders,
        userId: task.review_orders?.user_id,
        businessName: task.review_orders?.business_name,
        orderType: task.review_orders?.order_type,
        reactionType: task.review_orders?.reaction_type
      }
    };

    return { success: true, data: normalizedTask };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Submit URL task completion with proof
 */
export async function submitUrlTaskCompletionAction(urlTaskId: string, proof: string) {
  try {
    console.log("📝 [URL TASK] Submitting task completion:", urlTaskId);

    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    if (!proof || proof.trim().length === 0) {
      return { success: false, error: "Proof of completion is required" };
    }

    const supabaseAdmin = await createAdminClient();
    const now = new Date().toISOString();

    // Verify task is assigned to this employee
    const { data: task } = await (supabaseAdmin as any)
      .from("review_urls")
      .select("id, status, assigned_employee_id, review_order_id, review_orders!inner(user_id)")
      .eq("id", urlTaskId)
      .eq("assigned_employee_id", auth.user.id)
      .eq("status", "ASSIGNED")
      .single();

    if (!task) {
      return { success: false, error: "Task not found or not assigned to you" };
    }

    // Get client email
    const clientUserId = task.review_orders?.user_id;
    let clientEmail = null;
    if (clientUserId) {
      const { data: clientData } = await (supabaseAdmin as any)
        .from("users")
        .select("email")
        .eq("id", clientUserId)
        .single();
      clientEmail = clientData?.email || null;
    }

    // Mark task as completed
    const { error: completeError } = await (supabaseAdmin as any)
      .from("review_urls")
      .update({
        status: "COMPLETED",
        proof_of_completion: proof,
        completed_at: now
      })
      .eq("id", urlTaskId);

    if (completeError) throw completeError;

    console.log("✅ [URL TASK] Task marked as completed");

    // Check if all URLs in the order are completed
    const { data: allUrls } = await (supabaseAdmin as any)
      .from("review_urls")
      .select("status")
      .eq("review_order_id", task.review_order_id);

    const allCompleted = allUrls?.every((u: any) => u.status === "COMPLETED");

    if (allCompleted) {
      console.log("✅ [URL TASK] All URLs completed, crediting earnings");

      // Update order status
      await (supabaseAdmin as any)
        .from("review_orders")
        .update({
          status: "COMPLETED",
          completed_at: now,
          admin_verification_status: "APPROVED",
          admin_verified_at: now
        })
        .eq("id", task.review_order_id);

      // Credit employee earnings
      try {
        const { creditEmployeeEarningsAction } = await import("./employee-earnings");
        await creditEmployeeEarningsAction(auth.user.id, task.review_order_id);
      } catch (earningsError) {
        console.warn("Failed to credit earnings (non-blocking):", earningsError);
      }
    }

    // Update employee stats
    await (supabaseAdmin as any)
      .from("employee_stats")
      .update({ last_active_at: now })
      .eq("user_id", auth.user.id);

    // Send notifications
    (async () => {
      try {
        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          auth.user.email,
          "🎉 Review Task Completed",
          "Your review task has been completed successfully.",
          "TELEGRAM",
          "EMPLOYEE_REVIEW_COMPLETED",
          "HIGH",
          urlTaskId
        );
      } catch (notifError) {
        console.warn("Failed to send notification:", notifError);
      }
    })();

    if (clientEmail) {
      (async () => {
        try {
          const { sendNotificationAction } = await import("./notifications");
          await sendNotificationAction(
            clientEmail,
            "✅ Review Task Completed",
            allCompleted
              ? "All review tasks for your order have been completed!"
              : "A review task from your order has been completed.",
            "TELEGRAM",
            "REVIEWS_REVIEW_COMPLETED",
            "MEDIUM",
            urlTaskId
          );
        } catch (notifError) {
          console.warn("Failed to send notification:", notifError);
        }
      })();
    }

    revalidatePath("/e/dashboard");
    revalidatePath("/e/orders");

    console.log("🎉 [URL TASK] Task completion submitted successfully");

    return { success: true, allCompleted };
  } catch (error: any) {
    console.error("❌ [URL TASK] Error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract a display name from Facebook URL
 */
function extractBusinessNameFromUrl(url: string): string {
  try {
    const cleanUrl = url.trim();
    const urlObj = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
    const pathParts = urlObj.pathname.split('/').filter(p => p && p !== 'groups' && p !== 'user' && p !== 'posts');

    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      if (/^\d+$/.test(lastPart)) {
        return "Facebook Review Order";
      }
      return lastPart
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    return "Facebook Review Order";
  } catch {
    return "Facebook Review Order";
  }
}

// All exports are named exports above - no default export needed
// Each action is exported individually for importing
