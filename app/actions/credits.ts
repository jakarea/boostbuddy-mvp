"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/server-auth';
import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe/stripe";
import { randomUUID } from "crypto";

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
      .select("id, name, description, price, credits_amount, is_active")
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
    const { data, error } = await supabase
      .from("credit_packages")
      .select("id, name, description, price, credits_amount, is_active")
      .eq("is_active", true)
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
 * Create new credit package (admin only)
 */
export async function createCreditPackageAction(data: CreditPackageData) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const packageId = randomUUID();
    const now = new Date().toISOString();

    const supabase = await createAdminClient();
    const { data: package_, error } = await supabase
      .from("credit_packages")
      .insert({
        name: data.name,
        description: data.description || null,
        credits_amount: data.creditsAmount,
        price: data.price,
        is_active: data.isActive !== undefined ? data.isActive : true,
      })
      .select()
      .single();

    if (error) throw error;

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

    const { data: package_, error } = await supabase
      .from("credit_packages")
      .update(updateData)
      .eq("id", packageId)
      .select()
      .single();

    if (error) throw error;

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
    const { data: current } = await supabase
      .from("credit_packages")
      .select("is_active")
      .eq("id", packageId)
      .single();

    if (!current) {
      return { success: false, error: "Package not found" };
    }

    // Toggle status
    const { data: package_ } = await supabase
      .from("credit_packages")
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
    console.log("📍 [LOG#46a] Checking SUPABASE_SERVICE_ROLE_KEY...");
    console.log("📍 [LOG#46b] Service key exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log("📍 [LOG#46c] Service key length:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);

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
      console.log("📍 [LOG#47] Session already fulfilled");
      return;
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

    const { data: order, error: orderError } = await supabase
      .from("orders")
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

    // Get current balance
    const { data: user } = await supabase
      .from("users")
      .select("credits_balance, email")
      .eq("id", userId)
      .single();

    const currentBalance = user?.credits_balance || 0;
    const newBalance = currentBalance + creditsAmount;

    // Create credit transaction
    await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        amount: creditsAmount,
        balance_after: newBalance,
        type: "PURCHASE",
        description: `Purchased ${creditsAmount} credits`,
        reference_id: order.id,
      });

    // Update user balance
    await supabase
      .from("users")
      .update({ credits_balance: newBalance })
      .eq("id", userId);

    // Send notifications
    try {
      const { sendNotificationAction } = await import("./notifications");
      await sendNotificationAction(
        user?.email || userId,
        "💰 Credits Purchased Successfully",
        `You have purchased ${creditsAmount} credits. Your new balance is ${newBalance} credits.`,
        "TELEGRAM",
        "REVIEWS_CREDITS_PURCHASED",
        "MEDIUM",  // Priority: Purchase confirmation, not urgent
        null      // No related order ID for credit purchases
      );
    } catch (notifError) {
      console.warn("📍 [LOG#49] Failed to send notification:", notifError);
    }

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
export const getCreditTransactionsAction = getCreditsHistoryAction;

/**
 * Get wallet summary (balance + recent transactions) - optimized single call
 */
export async function getWalletSummaryAction(limit: number = 10) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const [userResult, transactionsResult] = await Promise.all([
      supabase.from("users").select("credits_balance").eq("id", auth.user.id).single(),
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

    return { success: true, balance: userResult.data?.credits_balance || 0, data: normalizedData };
  } catch (error: any) {
    console.error("Error fetching wallet summary:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get all credit transactions (admin only)
 */
export async function getAllCreditTransactionsAction(filters?: {
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
      // Get user IDs that match the search first
      const trimmed = filters.userSearch.trim();

      // Sanitize input to prevent PostgREST filter manipulation
      const sanitized = trimmed.replace(/[,\.\(\)%\\]/g, '');

      const { data: users } = await supabase
        .from("users")
        .select("id")
        .or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
        .limit(100);

      const userIds = users?.map(u => u.id) || [];
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

    // Validate inputs
    if (!data.userId || !data.reason) {
      return { success: false, error: "User ID and reason are required" };
    }

    if (data.amount === 0) {
      return { success: false, error: "Adjustment amount cannot be zero" };
    }

    const now = new Date().toISOString();

    const supabase = await createAdminClient();

    // Get current user balance
    const { data: user } = await supabase
      .from("users")
      .select("credits_balance, email, name")
      .eq("id", data.userId)
      .single();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const currentBalance = user.credits_balance || 0;
    const newBalance = currentBalance + data.amount;

    // Check if removal would make balance negative
    if (newBalance < 0) {
      return { success: false, error: "Cannot remove more credits than user has available" };
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: data.userId,
        amount: data.amount,
        balance_after: newBalance,
        type: data.amount > 0 ? "PURCHASE" : "SPEND",
        description: `Admin adjustment: ${data.reason}`,
        metadata: JSON.stringify({
          adminId: auth.user.id,
          adminEmail: auth.user.email,
          previousBalance: currentBalance,
          adjustmentType: data.amount > 0 ? "credit" : "debit",
        }),
      });

    if (transactionError) throw transactionError;

    // Update user balance with optimistic concurrency control to prevent race conditions
    // If balance has changed since we read it, the update will affect 0 rows
    const { data: updateResult, error: updateError } = await supabase
      .from("users")
      .update({ credits_balance: newBalance })
      .eq("id", data.userId)
      .eq("credits_balance", currentBalance);

    if (updateError) throw updateError;

    // Check if update failed due to concurrent modification
    if (!updateResult || updateResult.length === 0) {
      return { success: false, error: "Credit balance changed during adjustment. Please try again." };
    }

    // Send notification to user
    const { sendNotificationAction } = await import("./notifications");
    const notificationTitle = data.amount > 0
      ? "🔄 Credits Added to Your Account"
      : "🔄 Credits Removed from Your Account";

    await sendNotificationAction(
      user.email || data.userId,
      notificationTitle,
      `Your credits balance has been adjusted by ${data.amount > 0 ? '+' : ''}${data.amount} credits. Reason: ${data.reason}. New balance: ${newBalance} credits.`,
      "TELEGRAM",
      "REVIEWS_CREDITS_ADJUSTED",
      "HIGH",   // Priority: Financial adjustment requiring immediate attention
      null      // No related order ID for admin adjustments
    );

    revalidatePath("/a/services/credits");
    revalidatePath("/c/wallet");

    return {
      success: true,
      data: {
        previousBalance: currentBalance,
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
        .eq("type", "SPEND"),

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

    // Use ILIKE only on text columns (name, email) - NOT on UUID id column
    // PostgreSQL doesn't support ILIKE on UUID types
    // Sanitize input to prevent PostgREST filter manipulation
    const sanitized = trimmed.replace(/[,\.\(\)%\\]/g, '');
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
