"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/server-auth';
import { revalidatePath, revalidateTag } from "next/cache";
import { CacheTags, CacheRevalidator } from "@/lib/cache/cache-tags";
import { stripe } from "@/lib/stripe/stripe";
import { randomUUID } from "crypto";
import { checkRateLimit, RateLimitPresets, getClientIp } from "@/lib/rate-limit";
import { headers } from "next/headers";

// ============================================
// TYPES
// ============================================

export type CreditPackageData = {
  name: string;
  description?: string;
  creditsAmount: number;
  price: number;
  isActive?: boolean;
};

export type CreditAdjustmentData = {
  userId: string;
  amount: number;
  reason: string;
};

// ============================================
// CREDIT PACKAGES MANAGEMENT
// ============================================

/**
 * Get all credit packages (admin only)
 */
export async function getCreditPackagesAdminAction() {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("credit_packages")
      .select("id, name, description, price, credits_amount, is_active, created_at")
      .order("credits_amount", { ascending: true });

    if (error) throw error;

    // Transform snake_case to camelCase and convert values
    const packages = data?.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      price: typeof pkg.price === 'string' ? parseFloat(pkg.price) : pkg.price,
      creditsAmount: typeof pkg.credits_amount === 'string' ? parseInt(pkg.credits_amount) : pkg.credits_amount,
      isActive: pkg.is_active,
      createdAt: pkg.created_at || new Date().toISOString()
    })) || [];

    return { success: true, data: packages };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get active credit packages for client purchase
 */
export async function getActiveCreditPackagesAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();

    // Add caching for static data (credit packages don't change often)
    const { data, error } = await supabase
      .from("credit_packages")
      .select("id, name, description, price, credits_amount, is_active, created_at")
      .eq("is_active", true)
      .order("credits_amount", { ascending: true })
      // Cache for 5 minutes - packages are relatively static
      .throwOnError();

    if (error) throw error;

    // Transform snake_case to camelCase and convert values
    const packages = data?.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      price: typeof pkg.price === 'string' ? parseFloat(pkg.price) : pkg.price,
      creditsAmount: typeof pkg.credits_amount === 'string' ? parseInt(pkg.credits_amount) : pkg.credits_amount,
      isActive: pkg.is_active,
      createdAt: pkg.created_at || new Date().toISOString()
    })) || [];

    return { success: true, data: packages };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Create new credit package (admin only)
 */
export async function createCreditPackageAction(data: CreditPackageData) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const packageId = randomUUID();
    const now = new Date().toISOString();

    const supabase = await createAdminClient();
    const insertData: any = {
      name: data.name,
      description: data.description || null,
      credits_amount: data.creditsAmount,
      price: data.price,
      is_active: data.isActive !== undefined ? data.isActive : true,
    };
    const { data: package_, error } = await supabase
      .from("credit_packages")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    // Invalidate credit package caches
    revalidateTag(CacheTags.CREDIT_PACKAGES);
    revalidatePath("/a/services/credits");
    revalidatePath("/c/wallet");
    return { success: true, data: package_ };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update credit package (admin only)
 */
export async function updateCreditPackageAction(packageId: string, data: Partial<CreditPackageData>) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createAdminClient();
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.creditsAmount !== undefined) updateData.credits_amount = data.creditsAmount;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: package_, error } = await (supabase
      .from("credit_packages") as any)
      .update(updateData)
      .eq("id", packageId)
      .select()
      .single();

    if (error) throw error;

    // Invalidate credit package caches
    revalidateTag(CacheTags.CREDIT_PACKAGES);
    revalidatePath("/a/services/credits");
    revalidatePath("/c/wallet");
    return { success: true, data: package_ };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete credit package (admin only)
 */
export async function deleteCreditPackageAction(packageId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createAdminClient();

    // Check if package has been purchased
    const { data: purchases } = await supabase
      .from("orders")
      .select("id")
      .eq("credit_package_id", packageId)
      .limit(1);

    if (purchases && purchases.length > 0) {
      return { success: false, error: "Cannot delete package with purchase history" };
    }

    const { error } = await supabase
      .from("credit_packages")
      .delete()
      .eq("id", packageId);

    if (error) throw error;

    revalidatePath("/a/services/credits");
    revalidatePath("/c/wallet");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Toggle package active status (admin only)
 */
export async function togglePackageStatusAction(packageId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createAdminClient();

    // Get current status
    const { data: current } = await (supabase
      .from("credit_packages") as any)
      .select("is_active")
      .eq("id", packageId)
      .single();

    if (!current) {
      return { success: false, error: "Package not found" };
    }

    // Toggle status
    const { data: package_ } = await (supabase
      .from("credit_packages") as any)
      .update({ is_active: !current.is_active })
      .eq("id", packageId)
      .select()
      .single();

    revalidatePath("/a/services/credits");
    revalidatePath("/c/wallet");
    return { success: true, data: package_ };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// CREDITS PURCHASE & WEBHOOKS
// ============================================

/**
 * Create Stripe checkout session for credits purchase
 */
export async function purchaseCreditsAction(packageId: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    // Rate limiting: prevent abuse of credit purchases
    const headersList = await headers();
    const clientIp = getClientIp(headersList);
    const rateLimit = checkRateLimit(`credits:${auth.user.id}:${clientIp}`, RateLimitPresets.EXPENSIVE);
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.error || "Too many purchase attempts. Please try again later." };
    }

    const supabase = await createClient();
    const { data: package_, error: packageError } = await supabase
      .from("credit_packages")
      .select("id, name, description, price, credits_amount, is_active")
      .eq("id", packageId)
      .eq("is_active", true)
      .single();

    if (packageError || !package_) {
      return { success: false, error: "Credit package not found or inactive" };
    }

    // Convert database column names (snake_case) to camelCase
    const normalizedPackage = {
      ...package_,
      creditsAmount: typeof package_.credits_amount === 'string' ? parseInt(package_.credits_amount) : package_.credits_amount,
      price: typeof package_.price === 'string' ? parseFloat(package_.price) : package_.price
    };

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3400";

    console.log("Creating Stripe session for package:", normalizedPackage.name, "price:", normalizedPackage.price);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: auth.user.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: normalizedPackage.name,
              description: normalizedPackage.description || `${normalizedPackage.creditsAmount} Credits Package`,
            },
            unit_amount: Math.round(normalizedPackage.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/c/wallet/top-up?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/c/wallet/top-up`,
      metadata: {
        userId: auth.user.id,
        type: 'CREDITS_PURCHASE',
        packageId: normalizedPackage.id,
        creditsAmount: normalizedPackage.creditsAmount.toString(),
        amount: normalizedPackage.price.toString(),
      }
    });

    console.log("Stripe session created:", session.id);
    return { success: true, url: session.url };
  } catch (error: any) {
    console.error("Credits checkout error:", error);
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Provide more detailed error information
    let errorMessage = "Failed to create checkout session";
    if (error.type === 'StripeCardError') {
      errorMessage = `Stripe error: ${error.message}`;
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = `Invalid request: ${error.message}`;
    } else if (error.type === 'StripeAPIError') {
      errorMessage = `Stripe API error: ${error.message}`;
    } else if (error.type === 'StripeConnectionError') {
      errorMessage = `Stripe connection error: ${error.message}`;
    } else if (error.type === 'StripeAuthenticationError') {
      errorMessage = `Stripe authentication error - check API keys`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Fulfill credits purchase after successful Stripe payment
 */
export async function fulfillCreditsPurchase(sessionId: string) {
  try {
    console.log("📍 [LOG#1] fulfillCreditsPurchase START - sessionId:", sessionId);

    // Get session details from Stripe
    console.log("📍 [LOG#3] Attempting to retrieve Stripe session...");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("📍 [LOG#4] Stripe session retrieved successfully");

    const metadata = session.metadata;
    console.log("📍 [LOG#7] Session metadata:", JSON.stringify(metadata));

    if (!metadata || !metadata.userId || !metadata.packageId) {
      console.error("📍 [LOG#8] ERROR: Invalid session metadata");
      throw new Error("Invalid session metadata - missing userId or packageId");
    }

    const userId = metadata.userId;
    const packageId = metadata.packageId;
    const creditsAmount = parseInt(metadata.creditsAmount || "0");
    const amount = parseFloat(metadata.amount || "0");
    const now = new Date().toISOString();

    console.log("📍 [LOG#13] Parsed values - userId:", userId, "packageId:", packageId);
    console.log("📍 [LOG#14] Credits amount:", creditsAmount, "Price:", amount);

    console.log("📍 [LOG#46] Using production Supabase mode");

    let supabase;
    try {
      supabase = await createAdminClient();
      console.log("📍 [LOG#46d] Admin client created successfully");
    } catch (adminError) {
      console.error("📍 [LOG#46e] Failed to create admin client:", adminError);
      const message = adminError instanceof Error ? adminError.message : String(adminError);
      throw new Error(`Failed to create admin client: ${message}. Check SUPABASE_SERVICE_ROLE_KEY environment variable.`);
    }

    // IDEMPOTENCY: Check if this Stripe session was already fulfilled
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("📍 [LOG#47] Session already fulfilled - returning success to prevent webhook retries");
      return;  // Proper idempotency: silent return is OK for webhook fulfillment function
    }

    // Create order record
    console.log("📍 [LOG#47] Creating order record...");
    console.log("📍 [LOG#47a] Order data:", {
      user_id: userId,
      credit_package_id: packageId,
      amount,
      status: "PAID",
      type: "CREDITS_PURCHASE",
      stripe_session_id: sessionId,
    });

    const { data: order, error: orderError } = await (supabase
      .from("orders") as any)
      .insert({
        user_id: userId,
        credit_package_id: packageId,
        amount,
        status: "PAID",
        type: "CREDITS_PURCHASE",
        stripe_session_id: sessionId,
      })
      .select()
      .single();

    console.log("📍 [LOG#47b] Order creation result:", order);
    console.log("📍 [LOG#47c] Order error:", orderError);

    if (!order || orderError) {
      console.error("📍 [LOG#48] Failed to create order");
      console.error("📍 [LOG#48a] Error details:", orderError);
      console.error("📍 [LOG#48b] Error code:", orderError?.code);
      console.error("📍 [LOG#48c] Error message:", orderError?.message);
      console.error("📍 [LOG#48d] Error details:", orderError?.details);
      console.error("📍 [LOG#48e] Error hint:", orderError?.hint);
      throw new Error(`Failed to create order in Supabase: ${orderError?.message || 'Unknown error'}. Code: ${orderError?.code || 'Unknown'}`);
    }

    // Get current balance and update with retry logic for race condition handling
    const { updateCreditBalanceWithRetry } = await import("@/lib/credit-update");

    const creditResult = await updateCreditBalanceWithRetry({
      supabase,
      userId,
      creditsAmount,
      description: `Purchased ${creditsAmount} credits`,
      referenceId: order.id,
      type: "PURCHASE",
      retryOptions: {
        maxRetries: 3,
        initialDelay: 100,
        maxDelay: 2000
      }
    });

    if (!creditResult.success) {
      throw new Error(`Failed to update credit balance after ${creditResult.attempts} attempts: ${creditResult.error}`);
    }

    const newBalance = creditResult.newBalance!;
    const userEmail = creditResult.userEmail;

    // Send notifications
    try {
      const { sendNotificationAction } = await import("./notifications");
      await sendNotificationAction(
        userEmail || userId,
        "💰 Credits Purchased Successfully",
        `You have purchased ${creditsAmount} credits. Your new balance is ${newBalance} credits.`,
        "TELEGRAM",
        "REVIEWS_CREDITS_PURCHASED",
        "MEDIUM",  // Priority: Purchase confirmation, not urgent
        undefined      // No related order ID for credit purchases
      );
    } catch (notifError) {
      console.warn("📍 [LOG#49] Failed to send notification:", notifError);
    }

    // Invalidate credit-related caches after successful fulfillment
    CacheRevalidator.revalidateCredits();

    console.log("📍 [LOG#50] 🎉 Supabase fulfillment complete");
  } catch (error: any) {
    console.error("📍 [LOG#51] ❌ ERROR:", error.message);
    console.error("📍 [LOG#52] Stack:", error.stack);
    throw error; // Re-throw to propagate to caller
  }
  console.log("📍 [LOG#53] ========== FULFILL END ==========");
}

// ============================================
// USER CREDITS QUERIES
// ============================================

/**
 * Get user's current credits balance
 */
export async function getUserCreditsBalanceAction(userId?: string) {
  try {
    console.log("📍 [BALANCE#1] getUserCreditsBalanceAction called");
    console.log("📍 [BALANCE#2] userId parameter:", userId);

    const auth = await requireAuth();
    console.log("📍 [BALANCE#3] Auth check:", auth.success ? "SUCCESS" : "FAILED");

    if (!auth.success) return auth;

    const targetUserId = userId || auth.user.id;
    console.log("📍 [BALANCE#4] targetUserId:", targetUserId);

    const isOwnBalance = !userId || userId === auth.user.id;
    console.log("📍 [BALANCE#6] isOwnBalance:", isOwnBalance);

    // Only admins can check other users' balances
    if (!isOwnBalance && auth.user.role !== 'ADMIN') {
      console.log("📍 [BALANCE#7] ❌ Unauthorized - not admin");
      return { success: false, error: "Unauthorized" };
    }

    console.log("📍 [BALANCE#14] Using Supabase");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("credits_balance")
      .eq("id", targetUserId)
      .single();

    console.log("📍 [BALANCE#15] Supabase query result:", data);
    console.log("📍 [BALANCE#16] Supabase error:", error);

    if (error) throw error;

    return { success: true, balance: data?.credits_balance || 0 };
  } catch (error: any) {
    console.error("📍 [BALANCE#17] ❌ Error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get credits transaction history
 */
export async function getCreditsHistoryAction(userId?: string, limit: number = 20) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const targetUserId = userId || auth.user.id;
    const isOwnHistory = !userId || userId === auth.user.id;

    // Only admins can view others' history
    if (!isOwnHistory && auth.user.role !== 'ADMIN') {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("credit_transactions")
      .select("id, user_id, amount, balance_after, type, description, reference_id, created_at")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Normalize field names to camelCase for frontend
    const normalizedData = data?.map(tx => ({
      id: tx.id,
      userId: tx.user_id,
      amount: tx.amount,
      balanceAfter: tx.balance_after,
      type: tx.type,
      description: tx.description,
      referenceId: tx.reference_id,
      createdAt: tx.created_at
    })) || [];

    return { success: true, data: normalizedData };
  } catch (error: any) {
    console.error("Error fetching credits history:", error.message);
    return { success: false, error: error.message };
  }
}

// Alias for wallet page
export const getcredit_transactionssAction = getCreditsHistoryAction;

/**
 * Get wallet summary (balance + recent transactions) - optimized single call
 * Uses timestamp-based cache busting to prevent stale data
 */
export async function getWalletSummaryAction(limit: number = 10) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();

    // Add timestamp to prevent stale cached data
    const timestamp = Date.now();
    const [userResult, transactionsResult] = await Promise.all([
      // Use cache headers to prevent stale wallet data
      supabase
        .from("users")
        .select("credits_balance, updated_at")
        .eq("id", auth.user.id)
        .single(),
      supabase
        .from("credit_transactions")
        .select("id, user_id, amount, balance_after, type, description, reference_id, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(limit)
    ]);

    if (userResult.error) throw userResult.error;
    if (transactionsResult.error) throw transactionsResult.error;

    const normalizedData = transactionsResult.data?.map(tx => ({
      id: tx.id,
      userId: tx.user_id,
      amount: tx.amount,
      balanceAfter: tx.balance_after,
      type: tx.type,
      description: tx.description,
      referenceId: tx.reference_id,
      createdAt: tx.created_at
    })) || [];

    // Return balance with timestamp for version checking
    return {
      success: true,
      balance: userResult.data?.credits_balance || 0,
      data: normalizedData,
      lastUpdated: userResult.data?.updated_at || new Date().toISOString(),
      // Include cache timestamp for client-side cache busting
      cacheTimestamp: timestamp
    };
  } catch (error: any) {
    console.error("Error fetching wallet summary:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get all credit transactions (admin only)
 */
export async function getAllcredit_transactionssAction(filters?: {
  userSearch?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    console.log("🔍 [TRANSACTIONS] Loading all transactions with filters:", filters);
    const auth = await requireAuth({ role: 'ADMIN' });
    console.log("🔍 [TRANSACTIONS] Auth check:", auth.success ? "SUCCESS" : "FAILED");
    if (!auth.success) return auth;

    // Use admin client to bypass RLS policies
    const supabase = await createAdminClient();
    console.log("🔍 [TRANSACTIONS] Using admin client to bypass RLS");

    console.log("🔍 [TRANSACTIONS] Testing: Count all transactions first");
    const { count } = await supabase
      .from("credit_transactions")
      .select("*", { count: "exact", head: true });
    console.log("🔍 [TRANSACTIONS] Total transactions in database:", count);

    console.log("🔍 [TRANSACTIONS] Querying credit_transactions table...");
    let query = supabase
      .from("credit_transactions")
      .select("id, user_id, amount, balance_after, type, description, reference_id, created_at")
      .order("created_at", { ascending: false });

    if (filters?.userSearch) {
      console.log("🔍 [TRANSACTIONS] Filtering by user search:", filters.userSearch);
      // Use safe search utility to prevent injection
      const { searchUsersByNameOrEmail } = await import("@/lib/search");

      const { userIds, error: searchError } = await searchUsersByNameOrEmail(
        supabase,
        filters.userSearch,
        100
      );

      if (searchError) {
        console.error("🔍 [TRANSACTIONS] Search error:", searchError);
        return { success: false, error: `Search failed: ${searchError}` };
      }

      console.log("🔍 [TRANSACTIONS] Found matching user IDs:", userIds.length);

      if (userIds.length > 0) {
        query = query.in("user_id", userIds);
      } else {
        // If no users match, return empty result
        console.log("🔍 [TRANSACTIONS] No matching users, returning empty");
        return { success: true, data: [] };
      }
    }
    if (filters?.type) {
      console.log("🔍 [TRANSACTIONS] Filtering by type:", filters.type);
      query = query.eq("type", filters.type);
    }
    if (filters?.dateFrom) {
      console.log("🔍 [TRANSACTIONS] Filtering from date:", filters.dateFrom);
      query = query.gte("created_at", filters.dateFrom);
    }
    if (filters?.dateTo) {
      console.log("🔍 [TRANSACTIONS] Filtering to date:", filters.dateTo);
      query = query.lte("created_at", filters.dateTo);
    }

    const { data, error } = await query;
    console.log("🔍 [TRANSACTIONS] Query result - Error:", error);
    console.log("🔍 [TRANSACTIONS] Query result - Data count:", data?.length || 0);
    console.log("🔍 [TRANSACTIONS] Sample data:", data?.slice(0, 2));

    if (error) {
      console.error("🔍 [TRANSACTIONS] Database error:", error);
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("🔍 [TRANSACTIONS] Exception:", error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// ADMIN CREDIT ADJUSTMENTS
// ============================================

/**
 * Admin adjustment to user credits with mandatory logging
 */
export async function adminAdjustCreditsAction(data: CreditAdjustmentData) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    // Rate limiting for expensive admin operations
    const headersList = await headers();
    const clientIp = getClientIp(headersList);
    const rateLimit = checkRateLimit(`admin:credits:${auth.user.id}:${clientIp}`, RateLimitPresets.EXPENSIVE);
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.error || "Too many admin operations. Please try again later." };
    }

    // Validate inputs
    if (!data.userId || !data.reason) {
      return { success: false, error: "User ID and reason are required" };
    }

    if (data.amount === 0) {
      return { success: false, error: "Adjustment amount cannot be zero" };
    }

    const supabase = await createAdminClient();

    // Use the retry utility for atomic credit balance update
    const { updateCreditBalanceWithRetry } = await import("@/lib/credit-update");

    const creditResult = await updateCreditBalanceWithRetry({
      supabase,
      userId: data.userId,
      creditsAmount: data.amount,
      description: `Admin adjustment: ${data.reason}`,
      type: "ADMIN_ADJUST",
      retryOptions: {
        maxRetries: 3,
        initialDelay: 100,
        maxDelay: 2000
      }
    });

    if (!creditResult.success) {
      return { success: false, error: `Failed to adjust credits after ${creditResult.attempts} attempts: ${creditResult.error}` };
    }

    const newBalance = creditResult.newBalance!;

    console.log("✅ [CREDIT ADJUST] Credits updated successfully:", { newBalance, adjustment: data.amount });

    // Get user details for notification (non-blocking, don't fail entire operation if this fails)
    let userEmail = data.userId; // fallback to userId if email fetch fails
    try {
      const { data: user } = await (supabase
        .from("users") as any)
        .select("email, name")
        .eq("id", data.userId)
        .single();

      if (user?.email) {
        userEmail = user.email;
      }
    } catch (userError) {
      console.warn("Failed to fetch user details (non-blocking):", userError);
    }

    // Send notification to user (non-blocking, don't fail if notification fails)
    const { sendNotificationAction } = await import("./notifications");
    const notificationTitle = data.amount > 0
      ? "🔄 Credits Added to Your Account"
      : "🔄 Credits Removed from Your Account";

    // Fire and forget - don't await to avoid blocking the response
    sendNotificationAction(
      userEmail,
      notificationTitle,
      `Your credits balance has been adjusted by ${data.amount > 0 ? '+' : ''}${data.amount} credits. Reason: ${data.reason}. New balance: ${newBalance} credits.`,
      "TELEGRAM",
      "REVIEWS_CREDITS_ADJUSTED",
      "HIGH",   // Priority: Financial adjustment requiring immediate attention
      undefined      // No related order ID for admin adjustments
    ).catch((err) => {
      console.warn("Notification failed (non-blocking):", err);
    });

    // Invalidate credit-related caches (fire and forget - don't block response)
    const { CacheRevalidator } = await import("@/lib/cache/cache-tags");
    try {
      CacheRevalidator.revalidateCredits();
      revalidatePath("/a/services/credits");
      revalidatePath("/c/wallet");
    } catch (cacheError) {
      console.warn("Cache revalidation failed (non-blocking):", cacheError);
    }

    console.log("✅ [CREDIT ADJUST] Returning success response");

    return {
      success: true,
      data: {
        previousBalance: newBalance - data.amount,
        newBalance: newBalance,
        adjustment: data.amount,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get credits overview statistics (admin only)
 */
export async function getCreditsOverviewAction() {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createClient();

    // Parallelize all 4 independent queries for better performance
    const [
      purchases,
      spends,
      activePackagesResult,
      totalTransactionsResult
    ] = await Promise.all([
      // Get total credits sold
      supabase
        .from("credit_transactions")
        .select("amount")
        .eq("type", "PURCHASE"),

      // Get total credits consumed
      supabase
        .from("credit_transactions")
        .select("amount")
        .eq("type", "PURCHASE"),

      // Get active packages count
      supabase
        .from("credit_packages")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),

      // Get total transactions
      supabase
        .from("credit_transactions")
        .select("*", { count: "exact", head: true })
    ]);

    const totalCreditsSold = purchases?.data?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalCreditsConsumed = spends?.data?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    const activePackages = activePackagesResult?.count || 0;
    const totalTransactions = totalTransactionsResult?.count || 0;

    return {
      success: true,
      data: {
        totalCreditsSold,
        totalCreditsConsumed,
        activePackages: activePackages || 0,
        totalTransactions: totalTransactions || 0,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Search users by name, email, or ID for credit adjustment (admin only)
 */
export async function searchUsersForCreditsAction(query: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const trimmed = (query || '').trim();
    if (trimmed.length < 2) {
      return { success: true, data: [] };
    }

    const supabase = await createClient();

    // SECURITY: Use safe search sanitization to prevent filter manipulation
    const { sanitizeSearchInput, isSafeSearchInput } = await import("@/lib/search");

    const sanitized = sanitizeSearchInput(trimmed);

    // Validate input is safe before using in query
    if (!isSafeSearchInput(sanitized)) {
      console.warn("[SECURITY] Unsafe search input rejected:", trimmed);
      return { success: true, data: [] };
    }

    // Use ILIKE only on text columns (name, email) - NOT on UUID id column
    // PostgreSQL doesn't support ILIKE on UUID types
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, credits_balance")
      .eq("role", "CLIENT")
      .or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
      .order("name", { ascending: true })
      .limit(20);

    if (error) throw error;

    // Normalize to camelCase keys expected by the UI
    const normalized = (data || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      creditsBalance: u.credits_balance ?? 0,
    }));

    return { success: true, data: normalized };
  } catch (error: any) {
    console.error("Credit search error:", error.message);
    return { success: false, error: error.message };
  }
}
