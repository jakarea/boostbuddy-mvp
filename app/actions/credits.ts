"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/server-auth';
import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe/stripe";

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
      .select("*")
      .order("credits_amount", { ascending: true });

    if (error) throw error;
    return { success: true, data };
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
      .select("*")
      .eq("isActive", true)
      .order("credits_amount", { ascending: true });

    if (error) throw error;
    return { success: true, data };
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

    revalidatePath("/admin/services/credits");
    revalidatePath("/wallet");
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

    revalidatePath("/admin/services/credits");
    revalidatePath("/wallet");
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
      .eq("creditPackageId", packageId)
      .limit(1);

    if (purchases && purchases.length > 0) {
      return { success: false, error: "Cannot delete package with purchase history" };
    }

    const { error } = await supabase
      .from("credit_packages")
      .delete()
      .eq("id", packageId);

    if (error) throw error;

    revalidatePath("/admin/services/credits");
    revalidatePath("/wallet");
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
      .select("isActive")
      .eq("id", packageId)
      .single();

    if (!current) {
      return { success: false, error: "Package not found" };
    }

    // Toggle status
    const { data: package_ } = await supabase
      .from("credit_packages")
      .update({ is_active: !current.isActive })
      .eq("id", packageId)
      .select()
      .single();

    revalidatePath("/admin/services/credits");
    revalidatePath("/wallet");
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

    // Get package details
    const { data: package_, error: packageError } = await supabase
      .from("credit_packages")
      .select("*")
      .eq("id", packageId)
      .eq("isActive", true)
      .single();

    if (packageError || !package_) {
      return { success: false, error: "Credit package not found or inactive" };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3400";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: auth.user.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: package_.name,
              description: package_.description || `${package_.credits_amount} Credits Package`,
            },
            unit_amount: Math.round(package_.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/wallet?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/wallet`,
      metadata: {
        userId: auth.user.id,
        type: 'CREDITS_PURCHASE',
        packageId: package_.id,
        creditsAmount: package_.credits_amount.toString(),
        amount: package_.price.toString(),
      }
    });

    return { success: true, url: session.url };
  } catch (error: any) {
    console.error("Credits checkout error:", error);
    return { success: false, error: error.message || "Failed to create checkout session" };
  }
}

/**
 * Fulfill credits purchase after successful Stripe payment
 */
export async function fulfillCreditsPurchase(sessionId: string) {
  try {
    const supabase = await createAdminClient();

    // Get session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata = session.metadata;

    if (!metadata || !metadata.userId || !metadata.packageId) {
      console.error("Invalid session metadata for credits purchase");
      return;
    }

    const userId = metadata.userId;
    const packageId = metadata.packageId;
    const creditsAmount = parseInt(metadata.creditsAmount || "0");
    const amount = parseFloat(metadata.amount || "0");

    // Create order record
    const { data: order } = await supabase
      .from("orders")
      .insert({
        userId,
        creditPackageId: packageId,
        amount,
        status: "PAID",
        type: "CREDITS_PURCHASE",
        stripeSessionId: sessionId,
      })
      .select()
      .single();

    if (!order) {
      console.error("Failed to create order for credits purchase");
      return;
    }

    // Get current balance
    const { data: user } = await supabase
      .from("users")
      .select("creditsBalance")
      .eq("id", userId)
      .single();

    const currentBalance = user?.creditsBalance || 0;
    const newBalance = currentBalance + creditsAmount;

    // Create credit transaction
    await supabase
      .from("credit_transactions")
      .insert({
        userId,
        amount: creditsAmount,
        balanceAfter: newBalance,
        type: "PURCHASE",
        description: `Purchased ${creditsAmount} credits`,
        referenceId: order.id,
      });

    // Update user balance
    await supabase
      .from("users")
      .update({ creditsBalance: newBalance })
      .eq("id", userId);

    // Send notifications
    const { sendNotificationAction } = await import("./notifications");
    await sendNotificationAction(
      user?.email || userId,
      "💰 Credits Purchased Successfully",
      `You have purchased ${creditsAmount} credits. Your new balance is ${newBalance} credits.`,
      "TELEGRAM",
      "REVIEWS_CREDITS_PURCHASED"
    );

    console.log(`Credits purchase fulfilled: ${creditsAmount} credits for user ${userId}`);
  } catch (error: any) {
    console.error("Credits fulfillment error:", error);
  }
}

// ============================================
// USER CREDITS QUERIES
// ============================================

/**
 * Get user's current credits balance
 */
export async function getUserCreditsBalanceAction(userId?: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const targetUserId = userId || auth.user.id;
    const isOwnBalance = !userId || userId === auth.user.id;

    // Only admins can check other users' balances
    if (!isOwnBalance && auth.user.role !== 'ADMIN') {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("creditsBalance")
      .eq("id", targetUserId)
      .single();

    if (error) throw error;

    return { success: true, balance: data?.creditsBalance || 0 };
  } catch (error: any) {
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
      .select("*")
      .eq("userId", targetUserId)
      .order("createdAt", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all credit transactions (admin only)
 */
export async function getAllCreditTransactionsAction(filters?: {
  userId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createClient();
    let query = supabase
      .from("credit_transactions")
      .select("*")
      .order("createdAt", { ascending: false });

    if (filters?.userId) {
      query = query.eq("userId", filters.userId);
    }
    if (filters?.type) {
      query = query.eq("type", filters.type);
    }
    if (filters?.dateFrom) {
      query = query.gte("createdAt", filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte("createdAt", filters.dateTo);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
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

    const supabase = await createAdminClient();

    // Validate inputs
    if (!data.userId || !data.reason) {
      return { success: false, error: "User ID and reason are required" };
    }

    if (data.amount === 0) {
      return { success: false, error: "Adjustment amount cannot be zero" };
    }

    // Get current user balance
    const { data: user } = await supabase
      .from("users")
      .select("creditsBalance, email, name")
      .eq("id", data.userId)
      .single();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const currentBalance = user.creditsBalance || 0;
    const newBalance = currentBalance + data.amount;

    // Check if removal would make balance negative
    if (newBalance < 0) {
      return { success: false, error: "Cannot remove more credits than user has available" };
    }

    // Create transaction record
    const transactionType = data.amount > 0 ? "ADMIN_ADJUST" : "ADMIN_ADJUST";
    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        userId: data.userId,
        amount: data.amount,
        balanceAfter: newBalance,
        type: transactionType,
        description: data.reason,
        metadata: JSON.stringify({
          adminId: auth.user.id,
          adminEmail: auth.user.email,
          previousBalance: currentBalance,
          adjustmentType: data.amount > 0 ? "credit" : "debit",
        }),
      });

    if (transactionError) throw transactionError;

    // Update user balance
    const { error: updateError } = await supabase
      .from("users")
      .update({ creditsBalance: newBalance })
      .eq("id", data.userId);

    if (updateError) throw updateError;

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
      "REVIEWS_CREDITS_ADJUSTED"
    );

    revalidatePath("/admin/services/credits");
    revalidatePath("/wallet");

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

    // Get total credits sold
    const { data: purchases } = await supabase
      .from("credit_transactions")
      .select("amount")
      .eq("type", "PURCHASE");

    const totalCreditsSold = purchases?.reduce((sum, t) => sum + t.amount, 0) || 0;

    // Get total credits consumed
    const { data: spends } = await supabase
      .from("credit_transactions")
      .select("amount")
      .eq("type", "SPEND");

    const totalCreditsConsumed = spends?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

    // Get active packages count
    const { count: activePackages } = await supabase
      .from("credit_packages")
      .select("*", { count: "exact", head: true })
      .eq("isActive", true);

    // Get total transactions
    const { count: totalTransactions } = await supabase
      .from("credit_transactions")
      .select("*", { count: "exact", head: true });

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
