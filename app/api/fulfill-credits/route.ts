import { NextRequest, NextResponse } from "next/server";
import { fulfillCreditsPurchase } from "@/app/actions/credits";

/**
 * Manual fulfillment endpoint for testing credit purchases
 * POST /api/fulfill-credits
 * Body: { "sessionId": "cs_test_..." }
 *
 * This is only for development/testing - production uses webhooks
 *
 * IDEMPOTENCY: Safe to call multiple times with same sessionId
 * - If already fulfilled, returns success without updating balance again
 */
export async function POST(request: NextRequest) {
  try {
    console.log("📍 [API#1] ========== FULFILL API START ==========");
    console.log("📍 [API#2] Parsing request body...");

    const { sessionId } = await request.json();
    console.log("📍 [API#3] SessionId from request:", sessionId);

    if (!sessionId) {
      console.log("📍 [API#4] ERROR: No sessionId provided");
      return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
    }
    console.log("📍 [API#5] SessionId validation passed");

    console.log("📍 [API#6] Calling fulfillCreditsPurchase function...");
    console.log("📍 [API#7] Passing sessionId:", sessionId);

    await fulfillCreditsPurchase(sessionId);

    console.log("📍 [API#8] fulfillCreditsPurchase returned successfully");
    console.log("📍 [API#9] Returning success response");

    return NextResponse.json({
      success: true,
      message: "Credits fulfilled successfully"
    });
  } catch (error: any) {
    console.error("📍 [API#10] ❌ API ERROR:", error.message);
    console.error("📍 [API#11] Error type:", error.constructor.name);
    console.error("📍 [API#12] Error stack:", error.stack);

    // Return meaningful error message
    const errorMessage = error.message || "Fulfillment failed";
    console.log("📍 [API#13] Returning error response:", errorMessage);

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
  console.log("📍 [API#14] ========== FULFILL API END ==========");
}
