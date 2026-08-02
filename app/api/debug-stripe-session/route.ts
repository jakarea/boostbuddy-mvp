import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";

/**
 * Debug endpoint to check Stripe session details
 * GET /api/debug-stripe-session?session_id=cs_test_...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: "session_id parameter required" }, { status: 400 });
    }

    console.log("🔍 Checking Stripe session:", sessionId);

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      session_id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      metadata: session.metadata,
      amount_total: session.amount_total,
      customer_email: session.customer_email,
      created: new Date(session.created * 1000).toISOString()
    });
  } catch (error: any) {
    console.error("Stripe session debug error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
