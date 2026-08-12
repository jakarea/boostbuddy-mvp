"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server-auth";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// ============================================
// TYPES
// ============================================

export type EarningRuleData = {
  orderType: "REVIEW" | "COMMENT" | "COMMENT_WITH_PHOTO";
  reviewType?: string;
  reactionType?: string;
  paymentAmount: number;
  currency?: string;
  priority?: number;
};

export type PayoutFilters = {
  status?: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";
  page?: number;
  pageSize?: number;
};

export type EmployeeEarningsFilters = {
  status?: "ACTIVE" | "FROZEN" | "BANNED";
  page?: number;
  pageSize?: number;
  searchTerm?: string;
};

// ============================================
// ADMIN ACTIONS - EARNINGS OVERVIEW
// ============================================

/**
 * Get all employee earnings with pagination and filters
 */
export async function getAllEmployeeEarningsAction(filters?: EmployeeEarningsFilters) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabase = await createAdminClient();
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const startIndex = (page - 1) * pageSize;

    // Build count query
    let countQuery = supabase
      .from("employee_earnings")
      .select("id", { count: "exact", head: true });

    if (filters?.status) {
      countQuery = countQuery.eq("status", filters.status);
    }

    if (filters?.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.trim().toLowerCase();
      const sanitized = searchLower.replace(/[,\.\(\)%\\]/g, '');
      // We need to search by user email/name, so we'll do a different approach
      const { count } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "EMPLOYEE")
        .or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
      return { success: true, data: [], pagination: { page, pageSize, totalCount: count || 0, totalPages: Math.ceil((count || 0) / pageSize) } };
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) throw countError;

    // Build main query
    let query = supabase
      .from("employee_earnings")
      .select("*, users:user_id(name, email)")
      .order("total_earned", { ascending: false })
      .range(startIndex, startIndex + pageSize - 1);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Normalize data
    const normalizedData = data?.map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      user: item.users,
      balance: parseFloat(item.balance || "0"),
      totalEarned: parseFloat(item.total_earned || "0"),
      currentPeriodEarned: parseFloat(item.current_period_earned || "0"),
      status: item.status,
      payoutMethod: item.payout_method,
      payoutDetails: item.payout_details,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    })) || [];

    return {
      success: true,
      data: normalizedData,
      pagination: {
        page,
        pageSize,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pageSize)
      }
    };
  } catch (error: any) {
    console.error("❌ [ADMIN EARNINGS] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get detailed earnings breakdown for a specific employee
 */
export async function getEmployeeEarningsDetailAction(employeeId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = await createAdminClient();

    // Get earnings account
    const { data: earnings, error: earningsError } = await (supabaseAdmin as any)
      .from("employee_earnings")
      .select("*, users:user_id(name, email)")
      .eq("user_id", employeeId)
      .single();

    if (earningsError) throw earningsError;
    if (!earnings) {
      return { success: false, error: "Employee earnings not found" };
    }

    // Get transaction history
    const { data: transactions, error: txError } = await (supabaseAdmin as any)
      .from("employee_earning_transactions")
      .select("*")
      .eq("employee_earnings_id", earnings.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (txError) throw txError;

    // Get payout requests
    const { data: payouts, error: payoutError } = await (supabaseAdmin as any)
      .from("employee_payout_requests")
      .select("*")
      .eq("employee_earnings_id", earnings.id)
      .order("requested_at", { ascending: false })
      .limit(20);

    if (payoutError) throw payoutError;

    // Get earnings by type
    const { data: typeData } = await (supabaseAdmin as any)
      .from("employee_earning_transactions")
      .select("reference_type, amount")
      .eq("employee_earnings_id", earnings.id)
      .eq("type", "EARN");

    const byType = typeData?.reduce((acc: Record<string, number>, tx: any) => {
      const type = tx.reference_type || "OTHER";
      acc[type] = (acc[type] || 0) + parseFloat(tx.amount || "0");
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      success: true,
      data: {
        earnings: {
          ...earnings,
          balance: parseFloat(earnings.balance || "0"),
          totalEarned: parseFloat(earnings.total_earned || "0"),
          currentPeriodEarned: parseFloat(earnings.current_period_earned || "0")
        },
        transactions: transactions?.map((tx: any) => ({
          ...tx,
          amount: parseFloat(tx.amount || "0"),
          balanceAfter: parseFloat(tx.balance_after || "0")
        })) || [],
        payouts: payouts || [],
        byType
      }
    };
  } catch (error: any) {
    console.error("❌ [EMPLOYEE EARNINGS DETAIL] Error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================
// ADMIN ACTIONS - PAYMENT RULES
// ============================================

/**
 * Get all earning rules
 */
export async function getEarningRulesAction() {
  try {
    console.log('📋 [EARNING RULES] Fetching...');
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) {
      console.log('❌ [EARNING RULES] Auth failed:', auth);
      return auth;
    }

    console.log('✅ [EARNING RULES] Auth passed, creating admin client...');
    const supabaseAdmin = await createAdminClient();

    console.log('✅ [EARNING RULES] Admin client created, querying rules...');
    const { data, error } = await supabaseAdmin
      .from("employee_earning_rules")
      .select("*")
      .order("priority", { ascending: false })
      .order("order_type", { ascending: true });

    console.log('📊 [EARNING RULES] Query result:', { data, error });

    if (error) throw error;

    // Normalize data
    const normalizedData = data?.map((rule: any) => ({
      id: rule.id,
      orderType: rule.order_type,
      reviewType: rule.review_type,
      reactionType: rule.reaction_type,
      paymentAmount: parseFloat(rule.payment_amount || "0"),
      currency: rule.currency,
      isActive: rule.is_active,
      priority: rule.priority,
      createdAt: rule.created_at,
      updatedAt: rule.updated_at
    })) || [];

    return { success: true, data: normalizedData };
  } catch (error: any) {
    console.error("❌ [EARNING RULES] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create new earning rule
 */
export async function createEarningRuleAction(ruleData: EarningRuleData) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    // Validate
    const validOrderTypes = ["REVIEW", "COMMENT", "COMMENT_WITH_PHOTO"];
    if (!validOrderTypes.includes(ruleData.orderType)) {
      return { success: false, error: "Invalid order type" };
    }

    if (ruleData.paymentAmount <= 0) {
      return { success: false, error: "Payment amount must be greater than 0" };
    }

    const supabaseAdmin = await createAdminClient();
    const now = new Date().toISOString();

    const { error } = await (supabaseAdmin as any)
      .from("employee_earning_rules")
      .insert({
        order_type: ruleData.orderType,
        review_type: ruleData.reviewType || null,
        reaction_type: ruleData.reactionType || null,
        payment_amount: ruleData.paymentAmount.toFixed(2),
        currency: ruleData.currency || "EUR",
        priority: ruleData.priority || 0,
        is_active: true,
        created_at: now,
        updated_at: now
      });

    if (error) throw error;

    revalidatePath("/a/earnings/rules");

    return { success: true };
  } catch (error: any) {
    console.error("❌ [CREATE RULE] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update existing earning rule
 */
export async function updateEarningRuleAction(ruleId: string, ruleData: Partial<EarningRuleData>) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = await createAdminClient();

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (ruleData.orderType !== undefined) updateData.order_type = ruleData.orderType;
    if (ruleData.reviewType !== undefined) updateData.review_type = ruleData.reviewType || null;
    if (ruleData.reactionType !== undefined) updateData.reaction_type = ruleData.reactionType || null;
    if (ruleData.paymentAmount !== undefined) updateData.payment_amount = ruleData.paymentAmount.toFixed(2);
    if (ruleData.currency !== undefined) updateData.currency = ruleData.currency;
    if (ruleData.priority !== undefined) updateData.priority = ruleData.priority;

    const { error } = await (supabaseAdmin as any)
      .from("employee_earning_rules")
      .update(updateData)
      .eq("id", ruleId);

    if (error) throw error;

    revalidatePath("/a/earnings/rules");

    return { success: true };
  } catch (error: any) {
    console.error("❌ [UPDATE RULE] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete earning rule
 */
export async function deleteEarningRuleAction(ruleId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = await createAdminClient();

    const { error } = await (supabaseAdmin as any)
      .from("employee_earning_rules")
      .delete()
      .eq("id", ruleId);

    if (error) throw error;

    revalidatePath("/a/earnings/rules");

    return { success: true };
  } catch (error: any) {
    console.error("❌ [DELETE RULE] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggle earning rule active status
 */
export async function toggleEarningRuleAction(ruleId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = await createAdminClient();

    const { data: current } = await (supabaseAdmin as any)
      .from("employee_earning_rules")
      .select("is_active")
      .eq("id", ruleId)
      .single();

    if (!current) {
      return { success: false, error: "Rule not found" };
    }

    const newStatus = !current.is_active;

    const { error } = await (supabaseAdmin as any)
      .from("employee_earning_rules")
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq("id", ruleId);

    if (error) throw error;

    revalidatePath("/a/earnings/rules");

    return { success: true, data: { isActive: newStatus } };
  } catch (error: any) {
    console.error("❌ [TOGGLE RULE] Error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================
// ADMIN ACTIONS - PAYOUTS
// ============================================

/**
 * Get payout requests with filters
 */
export async function getPayoutRequestsAction(filters?: PayoutFilters) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = await createAdminClient();
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const startIndex = (page - 1) * pageSize;

    // Build count query
    let countQuery = supabaseAdmin
      .from("employee_payout_requests")
      .select("id", { count: "exact", head: true });

    if (filters?.status) {
      countQuery = countQuery.eq("status", filters.status);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) throw countError;

    // Build main query
    let query = supabaseAdmin
      .from("employee_payout_requests")
      .select("*, employee_earnings!inner(*, users:user_id(name, email))")
      .order("requested_at", { ascending: false })
      .range(startIndex, startIndex + pageSize - 1);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Normalize data
    const normalizedData = data?.map((req: any) => ({
      id: req.id,
      employeeEarningsId: req.employee_earnings_id,
      employee: req.employee_earnings?.users,
      amount: parseFloat(req.amount || "0"),
      status: req.status,
      rejectionReason: req.rejection_reason,
      requestedAt: req.requested_at,
      processedAt: req.processed_at,
      processedBy: req.processed_by,
      metadata: req.metadata ? JSON.parse(req.metadata) : null
    })) || [];

    return {
      success: true,
      data: normalizedData,
      pagination: {
        page,
        pageSize,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pageSize)
      }
    };
  } catch (error: any) {
    console.error("❌ [PAYOUT REQUESTS] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Process payout request (approve or reject)
 */
export async function processPayoutAction(
  requestId: string,
  action: "APPROVE" | "REJECT",
  metadata?: {
    paymentMethod?: string;
    reference?: string;
    notes?: string;
    rejectionReason?: string;
  }
) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = await createAdminClient();
    const now = new Date().toISOString();

    // Get payout request
    const { data: request, error: requestError } = await (supabaseAdmin as any)
      .from("employee_payout_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError) throw requestError;
    if (!request) {
      return { success: false, error: "Payout request not found" };
    }

    if (request.status !== "PENDING") {
      return { success: false, error: "Request already processed" };
    }

    if (action === "APPROVE") {
      // Get employee earnings
      const { data: earnings } = await (supabaseAdmin as any)
        .from("employee_earnings")
        .select("balance, user_id")
        .eq("id", request.employee_earnings_id)
        .single();

      if (!earnings) {
        return { success: false, error: "Employee earnings not found" };
      }

      const currentBalance = parseFloat(earnings.balance || "0");
      const payoutAmount = parseFloat(request.amount || "0");

      if (currentBalance < payoutAmount) {
        return { success: false, error: "Insufficient balance in earnings account" };
      }

      const newBalance = currentBalance - payoutAmount;

      // Update earnings balance
      await (supabaseAdmin as any)
        .from("employee_earnings")
        .update({
          balance: newBalance.toFixed(2),
          updated_at: now
        })
        .eq("id", request.employee_earnings_id);

      // Create transaction record
      await (supabaseAdmin as any).from("employee_earning_transactions").insert({
        id: randomUUID(),
        employee_earnings_id: request.employee_earnings_id,
        type: "PAYOUT",
        amount: (-payoutAmount).toFixed(2),
        balance_after: newBalance.toFixed(2),
        description: `Payout - ${metadata?.paymentMethod || "Bank Transfer"} (${metadata?.reference || "N/A"})`,
        metadata: JSON.stringify(metadata),
        created_at: now
      });

      // Update payout request
      await (supabaseAdmin as any)
        .from("employee_payout_requests")
        .update({
          status: "COMPLETED",
          processed_at: now,
          processed_by: auth.user.id,
          metadata: JSON.stringify(metadata)
        })
        .eq("id", requestId);

      console.log("✅ [PAYOUT] Approved:", { requestId, amount: payoutAmount });

      // Send notification to employee
      (async () => {
        try {
          const { data: employeeData } = await (supabaseAdmin as any)
            .from("users")
            .select("email")
            .eq("id", earnings.user_id)
            .single();

          if (employeeData?.email) {
            const { sendNotificationAction } = await import("./notifications");
            await sendNotificationAction(
              employeeData.email,
              `💰 Payout Approved: €${payoutAmount.toFixed(2)}`,
              `Your payout request for €${payoutAmount.toFixed(2)} has been approved and processed.`,
              "TELEGRAM",
              "EMPLOYEE_PAYOUT_APPROVED",
              "HIGH"
            );
          }
        } catch (notifError) {
          console.warn("Failed to send notification:", notifError);
        }
      })();

    } else {
      // Reject payout
      await (supabaseAdmin as any)
        .from("employee_payout_requests")
        .update({
          status: "REJECTED",
          rejection_reason: metadata?.rejectionReason || "Rejected by admin"
        })
        .eq("id", requestId);

      console.log("✅ [PAYOUT] Rejected:", requestId);
    }

    revalidatePath("/a/earnings/payouts");

    return { success: true };
  } catch (error: any) {
    console.error("❌ [PROCESS PAYOUT] Error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================
// ADMIN ACTIONS - MANUAL ADJUSTMENTS
// ============================================

/**
 * Manually adjust employee earnings (bonus or correction)
 */
export async function adminAdjustEarningsAction(data: {
  employeeId: string;
  amount: number;
  description: string;
  type: "BONUS" | "ADJUSTMENT";
}) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    if (data.amount === 0) {
      return { success: false, error: "Amount cannot be zero" };
    }

    if (!data.description || data.description.trim().length === 0) {
      return { success: false, error: "Description is required" };
    }

    const supabaseAdmin = await createAdminClient();
    const now = new Date().toISOString();

    // Get or create earnings
    const { data: earnings } = await (supabaseAdmin as any)
      .from("employee_earnings")
      .select("*")
      .eq("user_id", data.employeeId)
      .single();

    if (!earnings) {
      return { success: false, error: "Employee earnings account not found" };
    }

    const currentBalance = parseFloat(earnings.balance || "0");
    const currentTotal = parseFloat(earnings.total_earned || "0");
    const currentPeriod = parseFloat(earnings.current_period_earned || "0");

    const adjustmentAmount = data.amount;
    const newBalance = currentBalance + adjustmentAmount;
    const newTotal = adjustmentAmount > 0 ? currentTotal + adjustmentAmount : currentTotal;
    const newPeriod = adjustmentAmount > 0 ? currentPeriod + adjustmentAmount : currentPeriod;

    // Update earnings
    await (supabaseAdmin as any)
      .from("employee_earnings")
      .update({
        balance: newBalance.toFixed(2),
        total_earned: newTotal.toFixed(2),
        current_period_earned: newPeriod.toFixed(2),
        updated_at: now
      })
      .eq("user_id", data.employeeId);

    // Create transaction
    await (supabaseAdmin as any).from("employee_earning_transactions").insert({
      id: randomUUID(),
      employee_earnings_id: earnings.id,
      type: data.type,
      amount: adjustmentAmount.toFixed(2),
      balance_after: newBalance.toFixed(2),
      description: data.description,
      metadata: JSON.stringify({ adminId: auth.user.id, adminEmail: auth.user.email }),
      created_at: now
    });

    console.log("✅ [ADJUSTMENT] Applied:", { employeeId: data.employeeId, amount: adjustmentAmount });

    revalidatePath("/a/earnings");

    return { success: true, data: { newBalance, adjustmentAmount } };
  } catch (error: any) {
    console.error("❌ [ADJUSTMENT] Error:", error);
    return { success: false, error: error.message };
  }
}

// All exports are named exports above - no default export needed
// Each action is exported individually for importing
