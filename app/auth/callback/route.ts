import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LOG_PREFIX = "[AUTH-CALLBACK]";

export async function GET(request: Request) {
  console.group(`${LOG_PREFIX} Processing auth callback`);

  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    console.log("Step 1: Received code:", code ? "✅ Yes" : "❌ No");
    console.log("Step 2: Next URL:", next);

    if (!code) {
      console.error("❌ No authorization code provided");
      console.groupEnd();
      return NextResponse.redirect(`${origin}/?error=missing_code`);
    }

    // Exchange code for session
    console.log("Step 3: Exchanging code for session...");
    const supabase = await createClient();

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("❌ Code exchange failed:", exchangeError.message);
      console.groupEnd();
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(exchangeError.message)}`);
    }

    console.log("Step 4: ✅ Session established successfully");

    // Redirect to next URL or dashboard
    const redirectUrl = `${origin}${next}`;
    console.log("Step 5: Redirecting to:", redirectUrl);
    console.groupEnd();

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error(`${LOG_PREFIX} ❌ Unexpected error:`, err);
    const { origin } = new URL(request.url);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.groupEnd();
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(errorMsg)}`);
  }
}
