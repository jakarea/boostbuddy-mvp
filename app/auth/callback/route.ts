import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LOG_PREFIX = "[AUTH-CALLBACK]";

export async function GET(request: Request) {
  console.group(`${LOG_PREFIX} Processing auth callback`);

  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const next = searchParams.get("next") ?? "/c/dashboard";

    console.log("Step 1: Received code:", code ? "✅ Yes" : "❌ No");
    console.log("Step 1b: Received token_hash:", tokenHash ? "✅ Yes" : "❌ No", "| type:", type);
    console.log("Step 2: Next URL:", next);

    const supabase = await createClient();

    // --- Path A: token_hash flow (used by password recovery emails) ---
    if (tokenHash && type) {
      console.log("Step 3a: Verifying OTP token_hash...");
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "recovery" | "email" | "signup" | "invite" | "magiclink" | "email_change",
      });

      if (otpError) {
        console.error("❌ OTP verification failed:", otpError.message);
        console.groupEnd();
        return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(otpError.message)}`);
      }

      console.log("Step 4a: ✅ OTP verified successfully");

      // For password recovery, always redirect to /reset-password
      const redirectPath = type === "recovery" ? "/reset-password" : next;
      const redirectUrl = `${origin}${redirectPath}`;
      console.log("Step 5a: Redirecting to:", redirectUrl);
      console.groupEnd();
      return NextResponse.redirect(redirectUrl);
    }

    // --- Path B: PKCE code flow (OAuth, magic link, etc.) ---
    if (!code) {
      console.error("❌ No authorization code or token_hash provided");
      console.groupEnd();
      return NextResponse.redirect(`${origin}/?error=missing_code`);
    }

    // Exchange code for session
    console.log("Step 3b: Exchanging code for session...");
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("❌ Code exchange failed:", exchangeError.message);
      console.groupEnd();
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(exchangeError.message)}`);
    }

    console.log("Step 4b: ✅ Session established successfully");

    // Redirect to next URL or dashboard
    const redirectUrl = `${origin}${next}`;
    console.log("Step 5b: Redirecting to:", redirectUrl);
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
