"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server-auth";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// ============================================
// TYPES
// ============================================

export type OrderType = "REVIEW" | "COMMENT" | "COMMENT_WITH_PHOTO";

// ============================================
// HELPERS
// ============================================

/**
 * Extract a display name from Facebook URL
 * Generates a readable name like "Facebook Page Order" or uses URL path
 */
function extractBusinessNameFromUrl(url: string): string {
  try {
    // Clean up the URL
    const cleanUrl = url.trim();

    // Try to extract something meaningful from the URL
    const urlObj = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
    const pathParts = urlObj.pathname.split('/').filter(p => p && p !== 'groups' && p !== 'user' && p !== 'posts');

    // If we have meaningful path parts, use them
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      // If it looks like an ID (numbers only), use a generic name
      if (/^\d+$/.test(lastPart)) {
        return `Facebook Review Order`;
      }
      // Otherwise capitalize and use it
      return lastPart
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Fallback to generic name
    return `Facebook Review Order`;
  } catch {
    return `Facebook Review Order`;
  }
}

export type ReviewOrderData = {
  orderType: OrderType;
  facebookUrl: string;
  quantity: number;
  // Review-specific fields
  targetRating?: "5_STAR" | "4_STAR" | "3_STAR" | "2_STAR" | "1_STAR";
  content?: string; // Review content or comment text
  commentText?: string; // For COMMENT and COMMENT_WITH_PHOTO
  photoUrls?: string[]; // For COMMENT_WITH_PHOTO
};

export type ReviewOrderFilter = {
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  dateFrom?: string;
  dateTo?: string;
};

// Credit pricing will be fetched from database
interface CreditPricing {
  orderType: OrderType;
  creditsPerUnit: number;
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Get credit pricing for a specific order type
 */
export async function getReviewPricingAction(orderType: OrderType) {
  return getReviewCreditCostAction(orderType);
}

export async function getReviewCreditCostAction(orderType: OrderType) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("review_credit_pricing")
      .select("credits_per_unit")
      .eq("order_type", orderType)
      .eq("is_active", true)
      .single();

    if (error) throw error;
    if (!data) {
      return { success: false, error: "No pricing found for this order type" };
    }

    return { success: true, cost: data.credits_per_unit };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update credit pricing for a specific order type (Admin only)
 */
export async function updateReviewPricingAction(orderType: OrderType, creditsPerUnit: number) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    if (creditsPerUnit < 1) {
      return { success: false, error: "Credits per unit must be at least 1" };
    }

    const supabaseAdmin = await createAdminClient();

    const { error } = await supabaseAdmin
      .from("review_credit_pricing")
      .update({
        credits_per_unit: creditsPerUnit,
        updated_at: new Date().toISOString()
      })
      .eq("order_type", orderType);

    if (error) throw error;

    revalidatePath("/a/services/reviews/pricing");
    return { success: true, cost: creditsPerUnit };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Validate if user has enough credits for an order
 */
export async function validateCreditsForOrderAction(orderData: ReviewOrderData) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    // Validate order type
    const validOrderTypes: OrderType[] = ["REVIEW", "COMMENT", "COMMENT_WITH_PHOTO"];
    if (!validOrderTypes.includes(orderData.orderType)) {
      return { success: false, error: "Invalid order type" };
    }

    // Validate Facebook URL (accepts both facebook.com and fb.com)
    const facebookUrlRegex = /^https?:\/\/(www\.)?(facebook|fb)\.com\/.+/i;
    if (!facebookUrlRegex.test(orderData.facebookUrl)) {
      return { success: false, error: "invalid_facebook_url" };
    }

    // Validate quantity
    const quantity = orderData.quantity || 1;
    if (quantity < 1 || quantity > 100) {
      return { success: false, error: "Quantity must be between 1 and 100" };
    }

    // Type-specific validations
    if (orderData.orderType === "COMMENT" || orderData.orderType === "COMMENT_WITH_PHOTO") {
      // Validate comment text
      console.log("🔍 [VALIDATION] Checking comment text for order type:", orderData.orderType);
      console.log("🔍 [VALIDATION] Comment text value:", orderData.commentText);
      console.log("🔍 [VALIDATION] Comment text length:", orderData.commentText?.length);

      if (!orderData.commentText || orderData.commentText.trim().length === 0) {
        console.log("❌ [VALIDATION] Comment text validation failed");
        return { success: false, error: "Comment text is required" };
      }
      if (orderData.commentText.length > 500) {
        console.log("❌ [VALIDATION] Comment text too long");
        return { success: false, error: "Comment text must be less than 500 characters" };
      }
      console.log("✅ [VALIDATION] Comment text validation passed");


      // Validate photos for COMMENT_WITH_PHOTO
      if (orderData.orderType === "COMMENT_WITH_PHOTO") {
        if (!orderData.photoUrls || orderData.photoUrls.length === 0) {
          return { success: false, error: "At least one photo is required" };
        }
        if (orderData.photoUrls.length > 2) {
          return { success: false, error: "Maximum 2 photos allowed" };
        }
      }
    }

    // Get pricing from database
    console.log("💰 [VALIDATION] Getting pricing for order type:", orderData.orderType);

    const pricingResponse = await getReviewCreditCostAction(orderData.orderType);
    if (!pricingResponse.success) {
      console.error("❌ [VALIDATION] Failed to get pricing");
      return { success: false, error: "Failed to get pricing" };
    }

    const creditsPerUnit = pricingResponse.cost;
    const requiredCredits = creditsPerUnit * quantity;
    console.log("💰 [VALIDATION] Credits calculation:", { creditsPerUnit, quantity, requiredCredits });

    const supabase = await createClient();
    const { data } = await supabase
      .from("users")
      .select("credits_balance")
      .eq("id", auth.user.id)
      .single();

    if (!data) {
      console.error("❌ [VALIDATION] User not found");
      return { success: false, error: "User not found" };
    }

    const currentBalance = data.credits_balance || 0;
    const hasEnough = currentBalance >= requiredCredits;
    console.log("💰 [VALIDATION] Credit check:", { currentBalance, requiredCredits, hasEnough });
    return {
      success: true,
      hasEnough,
      currentBalance: data.credits_balance || 0,
      requiredCredits,
      orderType: orderData.orderType
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a new review order
 */
export async function createReviewOrderAction(orderData: ReviewOrderData) {
  console.log("📍 [ORDER] Starting order creation...");
  console.log("📍 [ORDER] Order data:", JSON.stringify(orderData, null, 2));

  try {
    const auth = await requireAuth();
    if (!auth.success) {
      console.error("❌ [ORDER] Auth failed:", auth);
      return auth;
    }

    console.log("📍 [ORDER] Auth passed, validating credits...");
    // Validate credits first
    const validation = await validateCreditsForOrderAction(orderData);
    console.log("📍 [ORDER] Credit validation result:", validation);

    if (!validation.success) {
      console.error("❌ [ORDER] Credit validation failed:", validation);
      return validation;
    }

    if (!validation.hasEnough) {
      console.error("❌ [ORDER] Insufficient credits:", validation);
      return {
        success: false,
        error: `Insufficient credits. Required: ${validation.requiredCredits}, Current: ${validation.currentBalance}`
      };
    }

    const requiredCredits = validation.requiredCredits;
    const orderId = randomUUID();
    const now = new Date().toISOString();
    let finalNewBalance = 0;

    console.log("📍 [ORDER] Credits validated, proceeding with order creation...");

    console.log("📍 [ORDER] Using Supabase...");
    // Production mode: Use Supabase
    const supabaseAdmin = await createAdminClient();

    // SECURITY: Optimistic concurrency control to prevent race conditions.
    const expectedBalance = validation.currentBalance;
    const newBalance = expectedBalance - requiredCredits;

    const { data: deducted, error: deductError } = await supabaseAdmin
      .from("users")
      .update({ credits_balance: newBalance })
      .eq("id", auth.user.id)
      .eq("credits_balance", expectedBalance)
      .select();

    if (deductError) throw deductError;
    if (!deducted || deducted.length === 0) {
      return { success: false, error: "Credit balance changed. Please try again." };
    }

    // Generate a business name from the Facebook URL
    const businessName = extractBusinessNameFromUrl(orderData.facebookUrl);

    // Create order with new field structure
    console.log("📍 [ORDER] Creating order in database...");

    const orderPayload = {
      id: orderId,
      user_id: auth.user.id,
      business_name: businessName, // Generated from Facebook URL
      review_type: "FACEBOOK", // required but not used in new system
      review_content: orderData.content || "", // required but not used in new system
      order_type: orderData.orderType,
      facebook_url: orderData.facebookUrl,
      quantity: orderData.quantity,
      target_rating: orderData.targetRating || "5_STAR",
      content: orderData.content || null,
      comment_text: orderData.commentText || null,
      photo_urls: orderData.photoUrls || null,
      credits_consumed: requiredCredits,
      number_of_reviews: orderData.quantity,
      status: "PENDING"
    };

    console.log("📍 [ORDER] Order payload:", JSON.stringify(orderPayload, null, 2));

    const { error: orderError } = await supabaseAdmin
      .from("review_orders")
      .insert(orderPayload);

    if (orderError) {
      console.error("❌ [ORDER] Database insert error:", orderError);
      throw orderError;
    }

    console.log("✅ [ORDER] Order created successfully in database");

    // Create transaction record
    await supabaseAdmin.from("credit_transactions").insert({
      id: randomUUID(),
      user_id: auth.user.id,
      amount: -requiredCredits,
      balance_after: newBalance,
      type: "SPEND",
      description: `${orderData.orderType} order (${orderData.quantity} units)`,
      reference_id: orderId
    });

    finalNewBalance = newBalance;
    console.log("📍 [ORDER] Supabase order created successfully");

    // Send notification (fire and forget - don't block on notification errors)
    (async () => {
      try {
        // Only send if TELEGRAM_BOT_TOKEN is configured
        if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN.length < 10) {
          console.log("Telegram notifications disabled - no bot token configured");
          return;
        }

        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          auth.user.email,
          `📝 New ${orderData.orderType} Order Created`,
          `Your ${orderData.orderType.toLowerCase()} order for ${orderData.quantity} unit${orderData.quantity > 1 ? 's' : ''} has been created. ${requiredCredits} credits have been deducted.`,
          "TELEGRAM",
          "REVIEWS_ORDER_CREATED"
        );
      } catch (notifError: any) {
        // Silently ignore notification errors - they shouldn't block order creation
        if (notifError.message?.includes('403') || notifError.message?.includes('Forbidden')) {
          console.log("Telegram notification skipped - bot not configured or chat not started");
        } else {
          console.error("Notification failed (non-blocking):", notifError);
        }
      }
    })(); // Fire and forget - don't await

    // Broadcast to all employees currently accepting orders so they can pick it up.
    // Non-blocking on failure — order creation already succeeded.
    (async () => {
      try {
        const { broadcastToEmployeesAction } = await import("./notifications");
        await broadcastToEmployeesAction(
          `🔔 New ${orderData.orderType} Order Available`,
          `A new ${orderData.orderType.toLowerCase()} order for ${orderData.quantity} unit${orderData.quantity > 1 ? 's' : ''} is ready to process.`,
          "EMPLOYEE_NEW_ORDER_AVAILABLE"
        );
      } catch (broadcastError) {
        console.warn("Failed to broadcast new order to employees:", broadcastError);
      }
    })(); // Fire and forget - don't await

    console.log("📍 [ORDER] Notifications dispatched, revalidating paths...");
    revalidatePath("/c/services/reviews/orders");
    revalidatePath("/wallet");

    console.log("📍 [ORDER] Order creation completed successfully, returning:", orderId);
    return {
      success: true,
      orderId,
      creditsConsumed: requiredCredits,
      newBalance: finalNewBalance
    };
  } catch (error: any) {
    console.error("📍 [ORDER] ❌ Error creating order:", error.message);
    return { success: false, error: error.message || "Failed to create order" };
  }
}

/**
 * Get client's review orders with filters
 */
export async function getClientReviewOrdersAction(filters?: ReviewOrderFilter) {
  try {
    console.log("📋 [CLIENT ORDERS] Starting to fetch orders...");
    const auth = await requireAuth();
    if (!auth.success) {
      console.log("❌ [CLIENT ORDERS] Auth failed");
      return auth;
    }

    console.log("✅ [CLIENT ORDERS] Auth passed, fetching orders for user:", auth.user.id);
    const supabase = await createClient();
    let query = supabase
      .from("review_orders")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ [CLIENT ORDERS] Database error:", error);
      throw error;
    }

    console.log("✅ [CLIENT ORDERS] Raw data fetched:", data?.length, "orders");

    // Normalize database column names from snake_case to camelCase
    const normalizedData = data?.map((order: any) => ({
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
      rejectionReason: order.rejection_reason,
      clientFeedback: order.client_feedback,
      content: order.content,
      commentText: order.comment_text,
      photoUrls: order.photo_urls ? JSON.parse(order.photo_urls) : null,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    })) || [];

    console.log("✅ [CLIENT ORDERS] Normalized data:", normalizedData.length, "orders");
    return { success: true, data: normalizedData };
  } catch (error: any) {
    console.error("❌ [CLIENT ORDERS] Error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get review order details
 */
export async function getReviewOrderDetailAction(orderId: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("review_orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", auth.user.id)
      .single();

    if (error) throw error;
    if (!data) {
      return { success: false, error: "Order not found" };
    }

    // Normalize database column names from snake_case to camelCase
    const normalizedData = {
      ...data,
      targetRating: data.target_rating,
      facebookUrl: data.facebook_url,
      businessName: data.business_name,
      orderType: data.order_type,
      reviewType: data.review_type,
      reviewContent: data.review_content,
      reviewInstructions: data.review_instructions,
      proofOfCompletion: data.proof_of_completion,
      creditsConsumed: data.credits_consumed,
      assignedEmployeeId: data.assigned_employee_id,
      assignedAt: data.assigned_at,
      completedAt: data.completed_at,
      adminVerificationStatus: data.admin_verification_status,
      adminVerifiedAt: data.admin_verified_at,
      rejectionReason: data.rejection_reason,
      clientFeedback: data.client_feedback,
      content: data.content,
      commentText: data.comment_text,
      photoUrls: data.photo_urls ? JSON.parse(data.photo_urls) : null,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    console.log("📸 [ORDER DETAILS] Photo data:", {
      orderType: normalizedData.orderType,
      photoUrlsRaw: data.photo_urls,
      photoUrlsNormalized: normalizedData.photoUrls,
      photoUrlsLength: normalizedData.photoUrls?.length
    });

    return { success: true, data: normalizedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Submit client feedback
 */
export async function submitClientFeedbackAction(orderId: string, feedback: "HAPPY" | "UNHAPPY" | "ANGRY") {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabaseAdmin = await createAdminClient();
    const { error } = await supabaseAdmin
      .from("review_orders")
      .update({ client_feedback: feedback })
      .eq("id", orderId)
      .eq("user_id", auth.user.id)
      .eq("status", "COMPLETED");

    if (error) throw error;

    revalidatePath("/c/services/reviews/orders");

    // Send notification to admin channel about client feedback
    try {
      const { sendNotificationAction } = await import("./notifications");
      const emoji = feedback === "HAPPY" ? "😊" : feedback === "UNHAPPY" ? "😕" : "😡";
      await sendNotificationAction(
        auth.user.email,
        `${emoji} Client Feedback Received`,
        `Client has submitted feedback "${feedback}" on order ${orderId}.`,
        "TELEGRAM",
        "REVIEWS_CLIENT_FEEDBACK"
      );
    } catch (notifError) {
      console.warn("Failed to send feedback notification:", notifError);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get reviews dashboard data (optimized single call)
 * Returns credits balance, credit costs for all platforms, and recent orders
 */
export async function getReviewsDashboardAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();

    // Parallel queries for Supabase
    const [userResult, costsResult, ordersResult] = await Promise.all([
      supabase.from("users").select("credits_balance").eq("id", auth.user.id).single(),
      supabase.from("review_credit_pricing").select("order_type, credits_per_unit").eq("is_active", true),
      supabase.from("review_orders")
        .select("id, business_name, review_type, target_rating, status, created_at, order_type, facebook_url")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(5)
    ]);

    if (userResult.error) throw userResult.error;
    if (costsResult.error) throw costsResult.error;
    if (ordersResult.error) throw ordersResult.error;

    // Build costs map
    const costsMap: Record<string, number> = {};
    costsResult.data?.forEach((cost: any) => {
      costsMap[cost.order_type] = cost.credits_per_unit;
    });

    // Normalize orders data
    const normalizedOrders = ordersResult.data?.map((order: any) => ({
      id: order.id,
      businessName: order.business_name,
      reviewType: order.review_type,
      targetRating: order.target_rating,
      status: order.status,
      createdAt: order.created_at,
      orderType: order.order_type,
      facebookUrl: order.facebook_url
    })) || [];

    return {
      success: true,
      data: {
        creditsBalance: userResult.data?.credits_balance || 0,
        creditCosts: costsMap,
        recentOrders: normalizedOrders
      }
    };
  } catch (error: any) {
    console.error("Error fetching reviews dashboard:", error.message);
    return { success: false, error: error.message };
  }
}