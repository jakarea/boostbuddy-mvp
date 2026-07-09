import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LOG_PREFIX = "[LOGOUT-API]";

/**
 * POST /api/logout
 * Complete logout endpoint - removes all auth data
 */
export async function POST() {
  console.group(`${LOG_PREFIX} Logout API called`);

  try {
    console.log("Step 1: Getting Supabase client...");
    const supabase = await createClient();

    console.log("Step 2: Signing out from Supabase...");
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("❌ Sign out error:", error.message);
      console.groupEnd();
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.log("Step 3: ✅ Signed out successfully");

    // Return response with cleared auth cookies
    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );

    // Clear auth cookies (set expiry to past)
    console.log("Step 4: Clearing auth cookies...");
    response.cookies.set("sb-auth-token", "", { maxAge: 0, path: "/" });
    response.cookies.set("sb-refresh-token", "", { maxAge: 0, path: "/" });

    console.log("Step 5: ✅ All auth data cleared");
    console.groupEnd();

    return response;
  } catch (err) {
    console.error(`${LOG_PREFIX} ❌ Error:`, err);
    console.groupEnd();

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
