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
export type ReactionType = "LIKE" | "LOVE" | "CARE" | "HAHA" | "WOW" | "SAD" | "ANGRY";

// ============================================
// HELPERS
// ============================================

/**
 * Sanitize comment text to prevent XSS and injection attacks
 * - Trims whitespace
 * - Strips HTML tags
 * - Escapes quotes
 * - Limits to 500 characters
 */
function sanitizeComment(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .replace(/<[^>]*>/g, '')           // Strip HTML tags
    .replace(/<script[^>]*>.*?<\/script>/gis, '')  // Strip script tags (case-insensitive)
    .replace(/javascript:/gi, '')     // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')       // Remove event handlers (onclick=, etc.)
    .replace(/"/g, '&quot;')          // HTML entity for double quotes
    .replace(/'/g, '&#39;')           // HTML entity for single quotes
    .replace(/</g, '&lt;')            // HTML entity for <
    .replace(/>/g, '&gt;')            // HTML entity for >
    .replace(/&(?![a-z]+;|#\d+;)/gi, '&amp;') // Escape & that's not part of entity
    .substring(0, 500);                 // Max 500 chars
}

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
  reactionType?: ReactionType; // Facebook reaction: LIKE, LOVE, CARE, HAHA, WOW, SAD, ANGRY
  // Review-specific fields
  content?: string; // Review content or comment text
  commentText?: string; // For COMMENT and COMMENT_WITH_PHOTO (legacy single comment)
  comments?: string[]; // Multiple comments for COMMENT types (1-50)
  photoUrls?: string[]; // For COMMENT_WITH_PHOTO (legacy)
  photoReviews?: Array<{ text: string; photos: string[] }>; // Multiple (text + photos) pairs for COMMENT_WITH_PHOTO
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
 * Get all pricing and user credits in a single call (optimized for page load)
 */
export async function getReviewOrderSetupAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();

    // Parallel queries: pricing + user credits
    const [pricingResult, userResult] = await Promise.all([
      supabase
        .from("review_credit_pricing")
        .select("order_type, credits_per_unit")
        .eq("is_active", true),
      supabase
        .from("users")
        .select("credits_balance")
        .eq("id", auth.user.id)
        .single()
    ]);

    if (pricingResult.error) throw pricingResult.error;
    if (userResult.error) throw userResult.error;
    if (!userResult.data) {
      return { success: false, error: "User not found" };
    }

    // Convert pricing array to object
    const pricingMap: Record<string, number> = {};
    pricingResult.data?.forEach((p: any) => {
      pricingMap[p.order_type] = p.credits_per_unit;
    });

    return {
      success: true,
      pricing: pricingMap,
      creditsBalance: userResult.data.credits_balance || 0
    };
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

    const { error } = await (supabaseAdmin as any)
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

    // Sanitize and validate Facebook URL (accepts both facebook.com and fb.com)
    const sanitizedUrl = orderData.facebookUrl.trim();
    const facebookUrlRegex = /^https?:\/\/(www\.)?(facebook|fb)\.com\/.+/i;
    if (!facebookUrlRegex.test(sanitizedUrl)) {
      return { success: false, error: "invalid_facebook_url" };
    }

    // Validate quantity
    const quantity = orderData.quantity || 1;
    if (quantity < 1 || quantity > 100) {
      return { success: false, error: "Quantity must be between 1 and 100" };
    }

    // Sanitize comment text to prevent XSS
    if (orderData.commentText) {
      orderData.commentText = orderData.commentText.trim();
      // Remove any HTML tags
      orderData.commentText = orderData.commentText.replace(/<[^>]*>/g, '');
    }

    // Type-specific validations
    if (orderData.orderType === "REVIEW") {
      // REVIEWS: Validate review texts
      console.log("🔍 [VALIDATION] Checking reviews for REVIEW type");

      if (orderData.comments && Array.isArray(orderData.comments)) {
        const validReviews = orderData.comments.filter(c => c && c.trim().length > 0);
        if (validReviews.length === 0) {
          console.log("❌ [VALIDATION] No reviews provided");
          return { success: false, error: "At least one review is required" };
        }
        if (validReviews.length > 50) {
          console.log("❌ [VALIDATION] Too many reviews");
          return { success: false, error: "Maximum 50 reviews allowed" };
        }
        // Validate each review
        for (let i = 0; i < validReviews.length; i++) {
          if (validReviews[i].length > 500) {
            return { success: false, error: `Review ${i + 1} must be less than 500 characters` };
          }
        }
        orderData.quantity = validReviews.length;
        console.log("✅ [VALIDATION] Reviews validated, quantity:", orderData.quantity);
      }
    }
    else if (orderData.orderType === "COMMENT_WITH_PHOTO") {
      // PHOTO + REVIEWS: Validate (text + photos) pairs
      console.log("🔍 [VALIDATION] Checking photo reviews for COMMENT_WITH_PHOTO type");

      if (orderData.photoReviews && Array.isArray(orderData.photoReviews)) {
        const validReviews = orderData.photoReviews.filter(r => r.text && r.text.trim().length > 0);
        if (validReviews.length === 0) {
          console.log("❌ [VALIDATION] No reviews provided");
          return { success: false, error: "At least one review is required" };
        }
        if (validReviews.length > 50) {
          console.log("❌ [VALIDATION] Too many reviews");
          return { success: false, error: "Maximum 50 reviews allowed" };
        }
        // Validate each review has photos
        for (let i = 0; i < validReviews.length; i++) {
          const review = validReviews[i];
          if (review.text.length > 500) {
            return { success: false, error: `Review ${i + 1} must be less than 500 characters` };
          }
          if (!review.photos || review.photos.length === 0) {
            return { success: false, error: `Review ${i + 1} must have at least 1 photo` };
          }
          if (review.photos.length > 1) {
            return { success: false, error: `Review ${i + 1} can have maximum 1 photo` };
          }
        }
        orderData.quantity = validReviews.length;
        console.log("✅ [VALIDATION] Photo reviews validated, quantity:", orderData.quantity);
      }
    }
    // COMMENT (Reactions) type requires no text/photos validation

    // Get pricing and user balance in parallel (optimized)
    console.log("💰 [VALIDATION] Getting pricing and balance for order type:", orderData.orderType);

    const supabase = await createClient();
    const [pricingResponse, userResult] = await Promise.all([
      getReviewCreditCostAction(orderData.orderType),
      supabase
        .from("users")
        .select("credits_balance")
        .eq("id", auth.user.id)
        .single()
    ]);

    if (!pricingResponse.success) {
      console.error("❌ [VALIDATION] Failed to get pricing");
      return { success: false, error: "Failed to get pricing" };
    }

    if (!userResult.data) {
      console.error("❌ [VALIDATION] User not found");
      return { success: false, error: "User not found" };
    }

    const creditsPerUnit = pricingResponse.cost;
    const requiredCredits = creditsPerUnit * quantity;
    console.log("💰 [VALIDATION] Credits calculation:", { creditsPerUnit, quantity, requiredCredits });

    const currentBalance = userResult.data.credits_balance || 0;
    const hasEnough = currentBalance >= requiredCredits;
    console.log("💰 [VALIDATION] Credit check:", { currentBalance, requiredCredits, hasEnough });
    return {
      success: true,
      hasEnough,
      currentBalance: userResult.data.credits_balance || 0,
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

    const { data: deducted, error: deductError } = await (supabaseAdmin as any)
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

    // Process comments: sanitize and convert to pipe-separated format
    let finalCommentText = null;
    let commentCount = orderData.quantity || 1;
    let finalPhotoUrls = null;

    if (orderData.orderType === "COMMENT") {
      // REACTIONS: No text, just quantity
      console.log("📍 [ORDER] Processing Reactions - no text needed");
      finalCommentText = null;
      finalPhotoUrls = null;
    }
    else if (orderData.orderType === "REVIEW") {
      // REVIEWS: Multiple review texts
      console.log("📍 [ORDER] Processing Reviews:", orderData.comments?.length || 0);
      if (orderData.comments && Array.isArray(orderData.comments)) {
        const sanitizedComments = orderData.comments.map(comment => sanitizeComment(comment));
        finalCommentText = sanitizedComments.join('|||');
        commentCount = sanitizedComments.length;
      }
    }
    else if (orderData.orderType === "COMMENT_WITH_PHOTO") {
      // PHOTO + REVIEWS: Multiple (text + photos) pairs
      console.log("📍 [ORDER] Processing Photo + Reviews:", orderData.photoReviews?.length || 0);
      if (orderData.photoReviews && Array.isArray(orderData.photoReviews)) {
        const sanitizedReviews = orderData.photoReviews.map(review => ({
          text: sanitizeComment(review.text),
          photos: review.photos || []
        }));
        // Store reviews as pipe-separated text
        finalCommentText = sanitizedReviews.map(r => r.text).join('|||');
        // Store photos as JSON array of arrays
        finalPhotoUrls = JSON.stringify(sanitizedReviews.map(r => r.photos));
        commentCount = sanitizedReviews.length;
      }
    }

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
      reaction_type: orderData.reactionType || "LIKE", // Default to LIKE
      content: null, // Not used in new system
      comment_text: finalCommentText, // Pipe-separated multiple comments/reviews
      comment_count: commentCount, // Number of reviews/reactions (1-50)
      completed_comments: null, // Initialize as null, will be updated as comments are completed
      photo_urls: finalPhotoUrls, // JSON array of photo arrays (for Photo + Reviews)
      credits_consumed: requiredCredits,
      number_of_reviews: orderData.quantity,
      status: "PENDING"
    };

    console.log("📍 [ORDER] Order payload:", JSON.stringify(orderPayload, null, 2));

    const { error: orderError } = await (supabaseAdmin as any)
      .from("review_orders")
      .insert(orderPayload);

    if (orderError) {
      console.error("❌ [ORDER] Database insert error:", orderError);
      throw orderError;
    }

    console.log("✅ [ORDER] Order created successfully in database");

    // Create transaction record (non-blocking - fire and forget)
    (supabaseAdmin as any).from("credit_transactions").insert({
      id: randomUUID(),
      user_id: auth.user.id,
      amount: -requiredCredits,
      balance_after: newBalance,
      type: "PURCHASE",
      description: `${orderData.orderType} order (${orderData.quantity} units)`,
      reference_id: orderId
    }).catch((err: any) => console.error("Failed to create transaction record:", err));

    finalNewBalance = newBalance;
    console.log("📍 [ORDER] Supabase order created successfully");

    // Import format helper
    const { formatOrderType } = await import("@/lib/utils");

    // Send notification (fire and forget - don't block on notification errors)
    (async () => {
      try {
        // Check if Telegram bot is configured via UI
        const supabaseAdmin = createAdminClient();
        const { data: setting } = await (supabaseAdmin as any)
          .from("app_settings")
          .select("value")
          .eq("key", "telegram_bot")
          .maybeSingle();

        const appSettings = setting?.value ? JSON.parse(setting.value as string) as { bot_token?: string } : null;
        if (!appSettings?.bot_token) {
          console.log("Telegram notifications disabled - bot not configured in Admin panel");
          return;
        }

        const { sendNotificationAction } = await import("./notifications");
        await sendNotificationAction(
          auth.user.email,
          `📝 New ${formatOrderType(orderData.orderType)} Order Created`,
          `Your ${formatOrderType(orderData.orderType).toLowerCase()} order for ${orderData.quantity} unit${orderData.quantity > 1 ? 's' : ''} has been created. ${requiredCredits} credits have been deducted.`,
          "TELEGRAM",
          "REVIEWS_ORDER_CREATED",
          "MEDIUM",
          orderId
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
          `🔔 New ${formatOrderType(orderData.orderType)} Order Available`,
          `A new ${formatOrderType(orderData.orderType).toLowerCase()} order for ${orderData.quantity} unit${orderData.quantity > 1 ? 's' : ''} is ready to process.`,
          "EMPLOYEE_NEW_ORDER_AVAILABLE",
          "HIGH",
          orderId
        );
      } catch (broadcastError) {
        console.warn("Failed to broadcast new order to employees:", broadcastError);
      }
    })(); // Fire and forget - don't await

    console.log("📍 [ORDER] Notifications dispatched, revalidating paths...");
    // Non-blocking cache revalidation - fire and forget
    (async () => {
      try {
        revalidatePath("/c/services/reviews/orders");
        revalidatePath("/wallet");
      } catch (err) {
        console.error("Cache revalidation failed (non-blocking):", err);
      }
    })();

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
      .select("id, user_id, status, facebook_url, business_name, order_type, review_type, review_content, review_instructions, proof_of_completion, credits_consumed, assigned_employee_id, assigned_at, completed_at, admin_verification_status, admin_verified_at, client_feedback, content, comment_text, comment_count, completed_comments, photo_urls, created_at, updated_at")
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
      photoReviews: order.photo_urls && order.order_type === 'COMMENT_WITH_PHOTO' && order.comment_text
        ? order.comment_text.split('|||').map((c: string, i: number) => ({
            text: c.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\'),
            photos: JSON.parse(order.photo_urls)[i] || []
          }))
        : null,
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

    // Fetch the order first (using regular client to verify ownership)
    const { data, error } = await supabase
      .from("review_orders")
      .select("id, user_id, status, facebook_url, business_name, order_type, review_type, reaction_type, review_content, review_instructions, proof_of_completion, credits_consumed, assigned_employee_id, assigned_at, completed_at, admin_verification_status, admin_verified_at, client_feedback, content, comment_text, comment_count, completed_comments, photo_urls, created_at, updated_at")
      .eq("id", orderId)
      .eq("user_id", auth.user.id)
      .single();

    if (error) throw error;
    if (!data) {
      return { success: false, error: "Order not found" };
    }

    // Fetch review_urls using admin client (bypasses RLS)
    // Safe because we've already verified the user owns this order
    const adminClient = createAdminClient();
    const { data: reviewUrlsData, error: urlsError } = await adminClient
      .from("review_urls")
      .select("id, url, quantity, reaction_type, review_content, photo_urls, review_index, status, assigned_employee_id, assigned_at, completed_at, proof_of_completion")
      .eq("review_order_id", orderId);

    if (urlsError) {
      console.error("Failed to fetch review URLs:", urlsError);
    }

    // Normalize database column names from snake_case to camelCase
    const normalizedData = {
      ...data,
      facebookUrl: data.facebook_url,
      businessName: data.business_name,
      orderType: data.order_type,
      reviewType: data.review_type,
      reactionType: data.reaction_type,
      reviewContent: data.review_content,
      reviewInstructions: data.review_instructions,
      proofOfCompletion: data.proof_of_completion,
      creditsConsumed: data.credits_consumed,
      assignedEmployeeId: data.assigned_employee_id,
      assignedAt: data.assigned_at,
      completedAt: data.completed_at,
      adminVerificationStatus: data.admin_verification_status,
      adminVerifiedAt: data.admin_verified_at,
      clientFeedback: data.client_feedback,
      content: data.content,
      commentText: data.comment_text,
      comments: data.comment_text ? data.comment_text.split('|||').map((c: string) => c.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\')) : [],
      commentCount: data.comment_count || 1,
      completedComments: data.completed_comments ? data.completed_comments.split(',').map((i: string) => parseInt(i)) : [],
      photoUrls: data.photo_urls ? JSON.parse(data.photo_urls) : null,
      // For Photo + Reviews, parse photoUrls as array of photo arrays
      photoReviews: data.photo_urls && data.order_type === 'COMMENT_WITH_PHOTO' && data.comment_text
        ? data.comment_text.split('|||').map((c: string, i: number) => ({
            text: c.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\'),
            photos: JSON.parse(data.photo_urls)[i] || []
          }))
        : null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      // Include review_urls data fetched separately
      reviewUrls: reviewUrlsData?.map((ru: any) => ({
        id: ru.id,
        url: ru.url,
        quantity: ru.quantity,
        reactionType: ru.reaction_type,
        reviewContent: ru.review_content,
        photoUrls: ru.photo_urls ? JSON.parse(ru.photo_urls) : null,
        reviewIndex: ru.review_index,
        status: ru.status,
        assignedEmployeeId: ru.assigned_employee_id,
        assignedAt: ru.assigned_at,
        completedAt: ru.completed_at,
        proofOfCompletion: ru.proof_of_completion
      })) || []
    };

    console.log("📸 [ORDER DETAILS] Photo data:", {
      orderType: normalizedData.orderType,
      photoUrlsRaw: data.photo_urls,
      photoUrlsNormalized: normalizedData.photoUrls,
      photoUrlsLength: normalizedData.photoUrls?.length
    });
    console.log("🔗 [ORDER DETAILS] Review URLs:", {
      count: normalizedData.reviewUrls.length,
      urls: normalizedData.reviewUrls
    });

    return { success: true, data: normalizedData };
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
        .select("id, business_name, review_type, status, created_at, order_type, facebook_url")
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