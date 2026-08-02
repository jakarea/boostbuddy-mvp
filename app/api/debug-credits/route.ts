import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server-auth";

/**
 * Debug endpoint to check credits state
 * GET /api/debug-credits
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.user.id;
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Get user balance
    const { data: user } = await supabase
      .from("users")
      .select("id, name, email, credits_balance")
      .eq("id", userId)
      .single();

    // Get recent credit transactions
    const { data: transactions } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get recent orders
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        creditsBalance: user?.credits_balance || 0
      },
      transactions: transactions || [],
      orders: orders || [],
      debug: {
        userId,
        mode: "supabase",
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error("Debug credits error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
