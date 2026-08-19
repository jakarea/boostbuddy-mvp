"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { checkRateLimit, RateLimitPresets, getClientIp } from "@/lib/rate-limit";

const LOG_PREFIX = "[AUTH-ACTIONS]";

export type AuthState = {
  success: boolean;
  error?: string;
  successMessage?: string;
  redirectUrl?: string;
};

/**
 * Sign in action - authenticate user and redirect based on role
 */
// Helper function to mask email for logging (prevents email exposure in logs)
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [username, domain] = email.split('@');
  return `${username.slice(0, 2)}***@${domain}`;
}

export async function signInAction(prevState: AuthState | undefined, formData: FormData): Promise<AuthState> {
  console.group(`${LOG_PREFIX} signInAction`);
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    console.log("❌ Missing email or password");
    console.groupEnd();
    return { success: false, error: "Email and password are required." };
  }

  // Apply rate limiting to prevent brute force attacks
  const headersList = await headers();
  const clientIp = getClientIp(headersList);
  const rateLimitCheck = checkRateLimit(`auth:${clientIp}`, RateLimitPresets.AUTH);

  if (!rateLimitCheck.allowed) {
    console.log("❌ Rate limit exceeded for IP:", clientIp);
    console.groupEnd();
    return { success: false, error: rateLimitCheck.error || "Too many login attempts. Please try again later." };
  }

  console.log("Rate limit check passed for IP:", clientIp, "Remaining attempts:", rateLimitCheck.remaining);

  console.log("Step 1: Signing in with email:", process.env.NODE_ENV === 'development' ? email : maskEmail(email));
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("❌ Sign in failed:", error.message);
    console.groupEnd();
    const msg = error.message.toLowerCase();
    if (msg.includes("email not confirmed") || msg.includes("confirm your email") || msg.includes("email not verified")) {
      return { success: false, error: "email_not_verified_login_error" };
    }
    return { success: false, error: error.message };
  }

  console.log("Step 2: Fetching user profile...");
  const auth = await supabase.auth.getUser();
  const user = auth.data?.user;

  if (!user) {
    console.error("❌ No user returned after sign in");
    console.groupEnd();
    return { success: false, error: "No user found" };
  }

  // Priority 1: Check Email Verification
  if (!user.email_confirmed_at) {
    console.log("❌ Sign in blocked: Priority 1 - Email not verified");
    await supabase.auth.signOut();
    console.groupEnd();
    return {
      success: false,
      error: "email_not_verified_login_error",
    };
  }

  // Read role and status from custom users table (reliable source of truth)
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    console.error("❌ Failed to fetch user role from users table:", userError?.message);
    console.groupEnd();
    return { success: false, error: "Failed to verify user role. Please contact support." };
  }

  const role = userData.role;
  const isActive = userData.status === 'ACTIVE';

  console.log("Step 3: ✅ Sign in authenticated | Role:", role, "| Status:", userData.status, "| isActive:", isActive);

  // Priority 2: Check if user is active (regardless of role)
  if (!isActive) {
    console.log("❌ Sign in blocked: Account is not active (status:", userData.status, ")");
    await supabase.auth.signOut();
    console.groupEnd();
    return { success: false, error: "pending_approval_login_error" };
  }

  // Priority 3: Role-based redirect
  if (role === "ADMIN") {
    console.log("Returning redirect URL: /a/dashboard");
    console.groupEnd();
    return { success: true, redirectUrl: "/a/dashboard" };
  } else if (role === "EMPLOYEE") {
    console.log("Returning redirect URL: /e/dashboard");
    console.groupEnd();
    return { success: true, redirectUrl: "/e/dashboard" };
  } else {
    console.log("Returning redirect URL: /c/dashboard");
    console.groupEnd();
    return { success: true, redirectUrl: "/c/dashboard" };
  }
}

/**
 * Sign up action - create new user account and profile
 * NOTE: Profile creation is handled by database trigger on auth.users INSERT
 * This action only creates the Supabase auth user
 */
export async function signUpAction(prevState: AuthState | undefined, formData: FormData): Promise<AuthState> {
  console.group(`${LOG_PREFIX} signUpAction`);
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // Validation
  console.log("Step 1: Validating input fields...");
  if (!name || !email || !password || !confirmPassword) {
    console.log("❌ Missing required fields");
    console.groupEnd();
    return { success: false, error: "All fields are required." };
  }

  if (password !== confirmPassword) {
    console.log("❌ Passwords don't match");
    console.groupEnd();
    return { success: false, error: "Passwords do not match." };
  }

  if (password.length < 12 || password.length > 128) {
    console.log("❌ Password length invalid");
    console.groupEnd();
    return { success: false, error: "Password must be 12-128 characters long." };
  }

  // Check password complexity
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    console.log("❌ Password complexity insufficient");
    console.groupEnd();
    return { success: false, error: "Password must contain uppercase, lowercase, number, and special character." };
  }

  // Apply rate limiting to prevent account creation spam
  const headersList = await headers();
  const clientIp = getClientIp(headersList);
  const rateLimitCheck = checkRateLimit(`signup:${clientIp}`, RateLimitPresets.AUTH);

  if (!rateLimitCheck.allowed) {
    console.log("❌ Rate limit exceeded for IP:", clientIp);
    console.groupEnd();
    return { success: false, error: rateLimitCheck.error || "Too many signup attempts. Please try again later." };
  }

  console.log("Rate limit check passed for IP:", clientIp, "Remaining attempts:", rateLimitCheck.remaining);

  // Create Supabase auth user (triggers database profile creation via handle_new_user)
  console.log("Step 2: Creating Supabase auth user:", process.env.NODE_ENV === 'development' ? email : maskEmail(email));
  const supabase = await createClient();

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role: "CLIENT", isActive: false },
    },
  });

  if (signUpError) {
    console.error("❌ Sign up failed:", signUpError.message);
    console.groupEnd();
    return { success: false, error: signUpError.message };
  }

  if (!data.user?.id) {
    console.error("❌ No user ID returned");
    console.groupEnd();
    return { success: false, error: "Sign up failed: no user ID" };
  }

  console.log("Step 3: ✅ Sign up complete, verifying profile creation...");

  // Verify profile was created (trigger is guaranteed to execute first)
  console.log("Step 4: Verifying profile creation...");
  const { data: profile, error: profileCheckError } = await supabase
    .from("users")
    .select("id, role, status")
    .eq("id", data.user.id)
    .single();

  if (profileCheckError || !profile) {
    console.error("❌ Profile verification failed:", profileCheckError?.message);
    console.groupEnd();
    return { success: false, error: "Failed to create user profile. Please try again." };
  }

  console.log("Step 5: ✅ Profile verified, role:", profile.role, "status:", profile.status);

  // Sign out user immediately so they must verify email and get admin approval
  await supabase.auth.signOut();

  // Send Telegram notification to Admin
  try {
    const { sendNotificationAction } = await import("@/app/actions/notifications");
    await sendNotificationAction(
      email,
      "🆕 New User Registration Pending Approval",
      `A new client has registered on BoostBuddy:\n\n👤 *Name:* ${name}\n📧 *Email:* ${email}\n\nPlease review and approve this client in the Admin Dashboard.`,
      "TELEGRAM",
      "SYSTEM",
      "HIGH"
    );
  } catch (err) {
    console.error("Failed to dispatch admin telegram notification:", err);
  }

  console.groupEnd();

  return {
    success: true,
    successMessage: "register_success_verify_email",
  };
}

/**
 * Sign out action - clear user session
 */
export async function signOutAction(): Promise<void> {
  console.log(`${LOG_PREFIX} signOutAction: Signing out user...`);
  const supabase = await createClient();
  await supabase.auth.signOut();
  console.log(`${LOG_PREFIX} ✅ Sign out complete, redirecting to home`);
  redirect("/");
}

/**
 * Reset password action - send reset email
 */
export async function resetPasswordAction(
  prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  console.group(`${LOG_PREFIX} resetPasswordAction`);
  const email = formData.get("email") as string;

  if (!email) {
    console.log("❌ Email is required");
    console.groupEnd();
    return { success: false, error: "Email is required." };
  }

  // Apply strict rate limiting to prevent email spam
  const headersList = await headers();
  const clientIp = getClientIp(headersList);
  const rateLimitCheck = checkRateLimit(`reset:${clientIp}`, RateLimitPresets.PASSWORD_RESET);

  if (!rateLimitCheck.allowed) {
    console.log("❌ Rate limit exceeded for IP:", clientIp);
    console.groupEnd();
    return { success: false, error: rateLimitCheck.error || "Too many password reset attempts. Please try again later." };
  }

  console.log("Rate limit check passed for IP:", clientIp, "Remaining attempts:", rateLimitCheck.remaining);

  console.log("Step 1: Sending password reset email to:", process.env.NODE_ENV === 'development' ? email : maskEmail(email));
  const supabase = await createClient();
  const host = (await headers()).get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    console.error("❌ Reset email failed:", error.message);
    console.groupEnd();
    return { success: false, error: error.message };
  }

  console.log("Step 2: ✅ Password reset email sent");
  console.groupEnd();
  return { success: true, successMessage: "A password recovery email has been sent. Check your inbox." };
}

/**
 * Update password action - change user password
 * SECURITY: Requires valid authentication session (reset token or current password)
 */
export async function updatePasswordAction(
  prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  console.group(`${LOG_PREFIX} updatePasswordAction`);
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // Verify user is authenticated or in password reset flow
  console.log("Step 0: Verifying authentication status...");
  const supabase = await createClient();
  const auth = await supabase.auth.getUser();
  const user = auth.data?.user;

  if (!user) {
    console.error("❌ User not authenticated");
    console.groupEnd();
    return { success: false, error: "You must be authenticated to change your password." };
  }

  console.log("Step 1: User authenticated, validating password...");

  if (!password || !confirmPassword) {
    console.log("❌ Passwords are required");
    console.groupEnd();
    return { success: false, error: "All fields are required." };
  }

  if (password !== confirmPassword) {
    console.log("❌ Passwords don't match");
    console.groupEnd();
    return { success: false, error: "Passwords do not match." };
  }

  if (password.length < 12 || password.length > 128) {
    console.log("❌ Password length invalid");
    console.groupEnd();
    return { success: false, error: "Password must be 12-128 characters long." };
  }

  // Check password complexity
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    console.log("❌ Password complexity insufficient");
    console.groupEnd();
    return { success: false, error: "Password must contain uppercase, lowercase, number, and special character." };
  }

  console.log("Step 2: Updating password for user:", process.env.NODE_ENV === 'development' ? user.email : maskEmail(user.email || ''));
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    console.error("❌ Password update failed:", error.message);
    console.groupEnd();
    return { success: false, error: error.message };
  }

  console.log("Step 3: ✅ Password updated successfully");
  console.groupEnd();
  redirect("/?reset=success");
}
