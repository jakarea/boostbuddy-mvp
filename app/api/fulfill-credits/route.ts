import { NextRequest, NextResponse } from "next/server";
import { fulfillCreditsPurchase } from "@/app/actions/credits";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    console.log("📍 [API] fulfill-credits called with sessionId:", sessionId);

    // Call the fulfillment function (returns void, throws on error)
    await fulfillCreditsPurchase(sessionId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("📍 [API] fulfill-credits error:", error);

    // Check if error is about already fulfilled session
    if (error.message?.includes('already fulfilled') || error.message?.includes('idempotency')) {
      return NextResponse.json({ success: true, alreadyFulfilled: true });
    }

    return NextResponse.json({ success: false, error: error.message || "Failed to fulfill purchase" }, { status: 500 });
  }
}
