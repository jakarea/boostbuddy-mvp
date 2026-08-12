"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server-auth";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// ============================================
// TYPES
// ============================================

export type EmployeeEarningsData = {
  balance: number;
  totalEarned: number;
  currentPeriodEarned: number;
  status: "ACTIVE" | "FROZEN" | "BANNED";
  payoutMethod?: string;
  payoutDetails?: string;
};

export type PayoutMethod = "BANK" | "PAYPAL" | "CRYPTO" | "OTHER";

// ============================================
// EMPLOYEE ACTIONS
// ============================================

/**
 * Get employee earnings and wallet balance
 */
export async function getEmployeeEarningsAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabaseAdmin = await createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("employee_earnings")
      .select("*")
      .eq("user_id", auth.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message };
    }

    // Create if not exists
    if (!data) {
      const now = new Date().toISOString();
      const { data: newEarnings, error: createError } = await (supabaseAdmin as any)
        .from("employee_earnings")
        .insert({
          user_id: auth.user.id,
          balance: "0.00",
          total_earned: "0.00",
          current_period_earned: "0.00",
          status: "ACTIVE",
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (createError) return { success: false, error: createError.message };

      // Normalize response
      return {
        success: true,
        data: {
          id: newEarnings.id,
          userId: newEarnings.user_id,
          balance: parseFloat(newEarnings.balance || "0"),
          totalEarned: parseFloat(newEarnings.total_earned || "0"),
          currentPeriodEarned: parseFloat(newEarnings.current_period_earned || "0"),
          status: newEarnings.status,
          payoutMethod: newEarnings.payout_method,
          payoutDetails: newEarnings.payout_details
        }
      };
    }

    // Normalize response
    return {
      success: true,
      data: {
        id: (data as any).id,
        userId: (data as any).user_id,
        balance: parseFloat((data as any).balance || "0"),
        totalEarned: parseFloat((data as any).total_earned || "0"),
        currentPeriodEarned: parseFloat((data as any).current_period_earned || "0"),
        status: (data as any).status,
        payoutMethod: (data as any).payout_method,
        payoutDetails: (data as any).payout_details
      }
    };
  } catch (error: any) {
    console.error("❌ [EMPLOYEE EARNINGS] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get employee earnings breakdown by review type
 */
export async function getEmployeeEarningsByTypeAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabaseAdmin = await createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("employee_earning_transactions")
      .select("reference_type, amount, created_at")
      .eq("employee_earnings.user_id", auth.user.id)
      .eq("type", "EARN")
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    // Group by type
    const byType = data?.reduce((acc: Record<string, number>, tx: any) => {
      const type = tx.reference_type || "OTHER";
      acc[type] = (acc[type] || 0) + parseFloat(tx.amount || "0");
      return acc;
    }, {} as Record<string, number>) || {};

    return { success: true, data: byType };
  } catch (error: any) {
    console.error("❌ [EARNINGS BY TYPE] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get employee earnings history/ledger
 */
export async function getEmployeeEarningsHistoryAction(limit: number = 50) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const supabaseAdmin = await createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("employee_earning_transactions")
      .select("*")
      .eq("employee_earnings.user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { success: false, error: error.message };

    // Normalize data
    const normalizedData = data?.map((tx: any) => ({
      id: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount || "0"),
      balanceAfter: parseFloat(tx.balance_after || "0"),
      description: tx.description,
      referenceOrderId: tx.reference_order_id,
      referenceType: tx.reference_type,
      metadata: tx.metadata,
      createdAt: tx.created_at
    })) || [];

    return { success: true, data: normalizedData };
  } catch (error: any) {
    console.error("❌ [EARNINGS HISTORY] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Request payout
 */
export async function requestPayoutAction(amount: number) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    if (amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }

    const supabaseAdmin = await createAdminClient();

    // Get current earnings
    const { data: earnings, error: earningsError } = await (supabaseAdmin as any)
      .from("employee_earnings")
      .select("id, balance")
      .eq("user_id", auth.user.id)
      .single();

    if (earningsError) throw earningsError;
    if (!earnings) {
      return { success: false, error: "Earnings account not found" };
    }

    const currentBalance = parseFloat(earnings.balance || "0");

    if (currentBalance < amount) {
      return { success: false, error: `Insufficient balance. Available: €${currentBalance}` };
    }

    // Check for pending payout requests
    const { data: pendingRequests } = await (supabaseAdmin as any)
      .from("employee_payout_requests")
      .select("amount")
      .eq("employee_earnings_id", earnings.id)
      .eq("status", "PENDING");

    const pendingAmount = pendingRequests?.reduce((sum: number, req: any) => sum + parseFloat(req.amount || "0"), 0) || 0;
    const availableBalance = currentBalance - pendingAmount;

    if (availableBalance < amount) {
      return { success: false, error: `Insufficient available balance. Available: €${availableBalance} (€${pendingAmount} in pending requests)` };
    }

    // Create payout request
    const now = new Date().toISOString();
    const { error: requestError } = await (supabaseAdmin as any)
      .from("employee_payout_requests")
      .insert({
        id: randomUUID(),
        employee_earnings_id: earnings.id,
        amount: amount.toFixed(2),
        status: "PENDING",
        requested_at: now
      });

    if (requestError) throw requestError;

    console.log("✅ [PAYOUT REQUEST] Created:", { userId: auth.user.id, amount });

    // Send notification to admin (optional - implement if needed)
    // const { sendNotificationAction } = await import("./notifications");
    // await sendNotificationAction(adminEmail, subject, message, ...);

    revalidatePath("/e/earnings");

    return { success: true, data: { amount, pendingAmount } };
  } catch (error: any) {
    console.error("❌ [PAYOUT REQUEST] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update payout method and details
 */
export async function updatePayoutDetailsAction(method: PayoutMethod, details: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    if (auth.user.role !== 'EMPLOYEE') {
      return { success: false, error: "Unauthorized - Employee only" };
    }

    const validMethods = ["BANK", "PAYPAL", "CRYPTO", "OTHER"];
    if (!validMethods.includes(method)) {
      return { success: false, error: "Invalid payout method" };
    }

    if (!details || details.trim().length === 0) {
      return { success: false, error: "Payout details are required" };
    }

    const supabaseAdmin = await createAdminClient();

    // Get or create earnings
    const { data: earnings } = await (supabaseAdmin as any)
      .from("employee_earnings")
      .select("id")
      .eq("user_id", auth.user.id)
      .single();

    let earningsId = earnings?.id;

    if (!earningsId) {
      const now = new Date().toISOString();
      const { data: newEarnings } = await (supabaseAdmin as any)
        .from("employee_earnings")
        .insert({
          user_id: auth.user.id,
          balance: "0.00",
          total_earned: "0.00",
          current_period_earned: "0.00",
          status: "ACTIVE",
          payout_method: method,
          payout_details: details,
          created_at: now,
          updated_at: now
        })
        .select("id")
        .single();

      earningsId = newEarnings?.id;
    } else {
      const { error: updateError } = await (supabaseAdmin as any)
        .from("employee_earnings")
        .update({
          payout_method: method,
          payout_details: details,
          updated_at: new Date().toISOString()
        })
        .eq("id", earningsId);

      if (updateError) throw updateError;
    }

    revalidatePath("/e/settings/payment");

    return { success: true };
  } catch (error: any) {
    console.error("❌ [PAYOUT DETAILS] Error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================
// INTERNAL ACTIONS (called by other server actions)
// ============================================

/**
 * Credit employee earnings when order is completed
 * This is called internally when all URLs in an order are completed
 */
export async function creditEmployeeEarningsAction(employeeId: string, orderId: string) {
  try {
    console.log("💰 [EARNINGS] Crediting employee:", { employeeId, orderId });

    const supabaseAdmin = await createAdminClient();

    // Get order details to find applicable payment rule
    const { data: order, error: orderError } = await (supabaseAdmin as any)
      .from("review_orders")
      .select("order_type, review_type")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("❌ [EARNINGS] Order not found:", orderId);
      return { success: false, error: "Order not found" };
    }

    // Find applicable payment rule (highest priority first)
    const { data: rule, error: ruleError } = await (supabaseAdmin as any)
      .from("employee_earning_rules")
      .select("*")
      .eq("order_type", order.order_type)
      .eq("is_active", true)
      .or(`review_type.is.null,review_type.eq.${order.review_type}`)
      .order("priority", { ascending: false })
      .limit(1)
      .single();

    if (ruleError || !rule) {
      console.error("❌ [EARNINGS] No payment rule found for:", { orderType: order.order_type, reviewType: order.review_type });
      return { success: false, error: "No payment rule configured" };
    }

    const paymentAmount = parseFloat(rule.payment_amount || "0");
    const now = new Date().toISOString();

    console.log("💰 [EARNINGS] Payment amount:", paymentAmount);

    // Get or create employee earnings
    const { data: earnings, error: earningsError } = await (supabaseAdmin as any)
      .from("employee_earnings")
      .select("*")
      .eq("user_id", employeeId)
      .single();

    if (earningsError && earningsError.code !== 'PGRST116') {
      throw earningsError;
    }

    if (!earnings) {
      // Create new earnings record
      const { data: newEarnings, error: createError } = await (supabaseAdmin as any)
        .from("employee_earnings")
        .insert({
          user_id: employeeId,
          balance: paymentAmount.toFixed(2),
          total_earned: paymentAmount.toFixed(2),
          current_period_earned: paymentAmount.toFixed(2),
          status: "ACTIVE",
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create transaction record
      await (supabaseAdmin as any).from("employee_earning_transactions").insert({
        id: randomUUID(),
        employee_earnings_id: newEarnings.id,
        type: "EARN",
        amount: paymentAmount.toFixed(2),
        balance_after: paymentAmount.toFixed(2),
        description: `Earning for ${order.order_type} - ${order.review_type || 'FACEBOOK'}`,
        reference_order_id: orderId,
        reference_type: order.order_type,
        created_at: now
      });

      console.log("✅ [EARNINGS] Credited to new earnings account:", paymentAmount);

      return { success: true, amount: paymentAmount };
    }

    // Update existing earnings
    const currentBalance = parseFloat(earnings.balance || "0");
    const currentTotal = parseFloat(earnings.total_earned || "0");
    const currentPeriod = parseFloat(earnings.current_period_earned || "0");

    const newBalance = currentBalance + paymentAmount;
    const newTotal = currentTotal + paymentAmount;
    const newPeriod = currentPeriod + paymentAmount;

    const { error: updateError } = await (supabaseAdmin as any)
      .from("employee_earnings")
      .update({
        balance: newBalance.toFixed(2),
        total_earned: newTotal.toFixed(2),
        current_period_earned: newPeriod.toFixed(2),
        updated_at: now
      })
      .eq("user_id", employeeId);

    if (updateError) throw updateError;

    // Create transaction record
    await (supabaseAdmin as any).from("employee_earning_transactions").insert({
      id: randomUUID(),
      employee_earnings_id: earnings.id,
      type: "EARN",
      amount: paymentAmount.toFixed(2),
      balance_after: newBalance.toFixed(2),
      description: `Earning for ${order.order_type} - ${order.review_type || 'FACEBOOK'}`,
      reference_order_id: orderId,
      reference_type: order.order_type,
      created_at: now
    });

    console.log("✅ [EARNINGS] Credited to existing account:", { paymentAmount, newBalance });

    // Send notification to employee
    (async () => {
      try {
        const { sendNotificationAction } = await import("./notifications");
        const { data: employeeData } = await (supabaseAdmin as any)
          .from("users")
          .select("email")
          .eq("id", employeeId)
          .single();

        if (employeeData?.email) {
          await sendNotificationAction(
            employeeData.email,
            `💰 You earned €${paymentAmount.toFixed(2)}!`,
            `Your review order has been completed and €${paymentAmount.toFixed(2)} has been added to your wallet.`,
            "TELEGRAM",
            "EMPLOYEE_EARNING_CREDITED",
            "MEDIUM",
            orderId
          );
        }
      } catch (notifError) {
        console.warn("Failed to send notification:", notifError);
      }
    })();

    return { success: true, amount: paymentAmount, newBalance };
  } catch (error: any) {
    console.error("❌ [EARNINGS] Error:", error);
    return { success: false, error: error.message };
  }
}

// All exports are named exports above - no default export needed
// Each action is exported individually for importing
