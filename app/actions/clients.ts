"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from '@/lib/auth/server-auth';
import { validateUserCreationInput } from "@/lib/utils/userUtils";
import { revalidatePath } from "next/cache";

export type InviteUserState = {
  success: boolean;
  message?: string;
  error?: string;
};

export type CreateClientData = {
  name: string;
  email: string;
  password: string;
  role?: "CLIENT" | "ADMIN" | "EMPLOYEE";
  telegram_chat_id?: string | null;
};

/**
 * Create new client/account directly (no email verification, no approval needed)
 * ADMIN ONLY: Creates account that's immediately active
 */
export async function createClientAction(data: CreateClientData) {
  try {
    console.log("👤 [CLIENT] Starting client creation (direct admin creation)...");

    const auth = await requireAuth({ role: "ADMIN" });
    if (!auth.success) {
      console.log("❌ [CLIENT] Auth failed:", auth.error);
      return auth;
    }

    console.log("✅ [CLIENT] Auth passed, validation...");

    // Validation
    if (!data.name?.trim() || !data.email?.trim() || !data.password) {
      console.log("❌ [CLIENT] Validation failed - missing fields");
      return { success: false, error: "Name, email, and password are required" };
    }

    if (data.password.length < 12) {
      console.log("❌ [CLIENT] Password too short");
      return { success: false, error: "Password must be at least 12 characters long." };
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(data.password);
    const hasLowerCase = /[a-z]/.test(data.password);
    const hasNumber = /[0-9]/.test(data.password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(data.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      console.log("❌ [CLIENT] Password complexity insufficient");
      return { success: false, error: "Password must contain uppercase, lowercase, number, and special character." };
    }

    const supabaseAdmin = await createAdminClient();

    // Check if user with this email already exists - OPTIMIZED: Direct query instead of O(N) lookup
    console.log("🔍 [CLIENT] Checking for existing users...");
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", data.email)
      .limit(1);

    const userExists = existingUser && existingUser.length > 0;

    if (userExists) {
      console.log("❌ [CLIENT] User already exists:", data.email);
      return { success: false, error: "User with this email already exists" };
    }

    console.log("✅ [CLIENT] User doesn't exist, creating via REST API...");

    // SOLUTION: Use Supabase REST API directly to create users (bypasses Auth client library issues)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const role = data.role || "CLIENT";

    try {
      console.log("📧 [CLIENT] Creating user via REST API:", data.email, "role:", role);

      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: {
            name: data.name,
            role: role,
            isActive: true,
            status: 'ACTIVE', // Store status in JWT metadata
            createdBy: auth.user.id
          },
          app_metadata: {
            role: role,
            status: 'ACTIVE' // Also store in app_metadata for faster access
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ [CLIENT] REST API failed:", response.status, errorData);
        return { success: false, error: `Failed to create user: ${response.status} ${JSON.stringify(errorData)}` };
      }

      const userData = await response.json();
      console.log("✅ [CLIENT] User created successfully via REST API:", userData.id);

      if (!userData.id) {
        console.error("❌ [CLIENT] No user ID in REST API response");
        return { success: false, error: "No user ID returned from user creation" };
      }

      const newUser = { user: userData };
      console.log("✅ [CLIENT] User creation completed:", newUser.user.id);

      // Create user profile in users table with ACTIVE status
      console.log("📝 [CLIENT] Creating user profile with ACTIVE status...");
      const now = new Date().toISOString();
      const { error: profileError } = await (supabaseAdmin
        .from("users") as any)
        .insert({
          id: newUser.user.id,
          email: data.email,
          name: data.name,
          role: role,
          status: "ACTIVE", // Immediately active - no approval needed
          email_verified: true, // Email considered verified for admin-created accounts
          telegram_chat_id: data.telegram_chat_id || null,
          created_at: now,
          updated_at: now
        });

      if (profileError) {
        console.error("⚠️ [CLIENT] Failed to create user profile:", profileError);
        // Don't fail here - the auth user was created successfully
      } else {
        console.log("✅ [CLIENT] User profile created with ACTIVE status");
      }

      // Send notification to the new user that their account is ready
      try {
        const { sendNotificationAction } = await import("./notifications");
        const dashboardUrl = role === "EMPLOYEE" ? "/e/dashboard" : "/c/dashboard";
        await sendNotificationAction(
          data.email,
          "🎉 Your BoostBuddy Account is Ready!",
          `Hello ${data.name},\n\nYour ${role.toLowerCase()} account has been created and is ready to use!\n\nYou can log in immediately at: https://boostbuddy.it${dashboardUrl}\n\nYour credentials:\n📧 Email: ${data.email}\n🔑 Password: [The password you set]\n\nWelcome to BoostBuddy!`,
          "TELEGRAM",
          "SYSTEM",
          "HIGH"
        );
      } catch (notifError) {
        console.log("⚠️ [CLIENT] Failed to send notification (non-blocking):", notifError);
      }

      revalidatePath("/a/clients");

      console.log("🎉 [CLIENT] Client creation completed successfully");

      return {
        success: true,
        data: {
          id: newUser.user.id,
          email: newUser.user.email,
          name: data.name,
          role: role
        }
      };

    } catch (restApiError: any) {
      console.error("❌ [CLIENT] REST API exception:", restApiError);
      return { success: false, error: restApiError.message || "Failed to create user via REST API" };
    }
  } catch (error: any) {
    console.error("❌ [CLIENT] Client creation error:", error);
    return { success: false, error: error.message || "Failed to create client" };
  }
}

/**
 * Server Action to invite a new user to the platform.
 * It creates the user in Supabase Auth (sending them an invite email),
 * and creates their profile in the public.users table.
 */
export async function inviteUserAction(
  prevState: InviteUserState | null,
  formData: FormData
): Promise<InviteUserState> {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return { success: false, error: auth.error };

    // 1. Pure validation of inputs
    const rawName = formData.get("name");
    const rawEmail = formData.get("email");
    const rawRole = formData.get("role");

    const validation = validateUserCreationInput(rawName, rawEmail, rawRole);

    if (!validation.success || !validation.data) {
      return { success: false, error: validation.error };
    }

    const { name, email, role } = validation.data;

    // 2. Initialize Admin Client
    let supabaseAdmin;
    try {
      supabaseAdmin = createAdminClient();
    } catch (e: any) {
      return { 
        success: false, 
        error: "Server configuration error: " + e.message 
      };
    }

    // 3. Invite user via Supabase Auth Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        name: name,
        role: role
      }
    });

    if (authError) {
      // Handle "user already exists" gracefully if possible, or just return the error
      return { success: false, error: "Failed to invite user: " + authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create user account. No user data returned." };
    }

    // 4. Upsert into public.users table
    // Note: The id matches the auth.users.id
    // We use upsert instead of insert because Supabase often has a database trigger
    // that automatically inserts a row into public.users upon user creation.
    const { error: dbError } = await (supabaseAdmin
      .from("users") as any)
      .upsert({
        id: authData.user.id,
        email: email,
        name: name,
        role: role,
        status: "ACTIVE", // Or PENDING, depending on business rules. We use ACTIVE here per previous mock logic.
      }, { onConflict: "id" });

    if (dbError) {
      console.error("Failed to insert into public.users:", dbError);
      // Even if public.users fails, the auth user is created.
      // In a robust system, we might delete the auth user to rollback, or rely on a DB trigger.
      return { 
        success: false, 
        error: "User was invited but failed to create database profile: " + dbError.message 
      };
    }

    // 5. Success & Cache Revalidation
    revalidatePath("/a/clients");
    
    return {
      success: true,
      message: `Successfully sent invitation to ${email}`,
    };

  } catch (error: any) {
    console.error("Invite User Action Error:", error);
    return {
      success: false,
      error: "An unexpected error occurred while creating the account.",
    };
  }
}

// ============================================================================
// Data Fetching and Management Actions
// ============================================================================

export async function getClientsAction() {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) throw new Error(auth.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, role, status, created_at")
    .eq("role", "CLIENT")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch clients:", error);
    throw new Error("Failed to fetch clients");
  }
  return data;
}

export async function getProfileCountsAction() {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) throw new Error(auth.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_accounts")
    .select("assigned_client_id, status");

  if (error) {
    console.error("Failed to fetch profile counts:", error);
    throw new Error("Failed to fetch profile counts");
  }

  // Create a map of clientId -> count of active/assigned profiles
  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.assigned_client_id && row.status !== "AVAILABLE") {
      counts[row.assigned_client_id] = (counts[row.assigned_client_id] || 0) + 1;
    }
  }
  return counts;
}

export async function getBillingInfoAction(userId: string) {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) throw new Error(auth.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_info")
    .select("id, user_id, billing_type, country, name, address, city, postal_code, vat_number, fiscal_code, sdi_code")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 means no rows returned
    console.error("Failed to fetch billing info:", error);
    throw new Error("Failed to fetch billing info");
  }

  // Transform snake_case to camelCase
  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    billingType: data.billing_type,
    country: data.country,
    name: data.name,
    address: data.address,
    city: data.city,
    postalCode: data.postal_code,
    vatNumber: data.vat_number,
    fiscalCode: data.fiscal_code,
    sdiCode: data.sdi_code,
  };
}

export async function updateBillingInfoAction(userId: string, billingData: any) {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return { success: false, error: auth.error };

  const supabase = await createClient();
  
  // Format the data to match database snake_case
  const payload = {
    user_id: userId,
    billing_type: billingData.billingType,
    country: billingData.country,
    name: billingData.name,
    address: billingData.address,
    city: billingData.city,
    postal_code: billingData.postalCode,
    vat_number: billingData.vatNumber,
    fiscal_code: billingData.fiscalCode,
    sdi_code: billingData.sdiCode,
  };

  const { error } = await supabase
    .from("billing_info")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("Failed to update billing info:", error);
    return { success: false, error: "Failed to update billing information." };
  }

  revalidatePath("/a/clients");
  return { success: true };
}

export async function updateClientStatusAction(userId: string, status: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();

    // Fetch user details for notification
    const { data: clientUser } = await (supabaseAdmin
      .from("users") as any)
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();

    const { error } = await (supabaseAdmin
      .from("users") as any)
      .update({ status })
      .eq("id", userId);

    if (error) {
      console.error("Failed to update client status:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    // Send Telegram approval notification if approved
    if (status === "ACTIVE" && clientUser?.email) {
      try {
        const { sendNotificationAction } = await import("@/app/actions/notifications");
        await sendNotificationAction(
          clientUser.email,
          "🎉 Account Approved!",
          `Hello ${clientUser.name || "Client"},\n\nYour BoostBuddy account registration has been approved by the administrator!\n\nYou can now log into your account at https://boostbuddy.it`,
          "TELEGRAM",
          "SYSTEM",
          "HIGH"
        );
      } catch (err) {
        console.error("Failed to send approval telegram notification:", err);
      }
    }

    revalidatePath("/a/clients");
    revalidatePath("/a/dashboard");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in updateClientStatusAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}

/**
 * Approve client registration AND mark email as verified in Supabase Auth in 1-Click
 */
export async function approveClientAndVerifyEmailAction(userId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();

    // 1. Mark email as confirmed in Supabase Auth
    try {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (authErr) {
        console.error("Warning: Failed to auto-confirm email in Supabase Auth:", authErr.message);
      }
    } catch (authEx) {
      console.error("Exception marking email as confirmed:", authEx);
    }

    // 2. Fetch user details and update status to ACTIVE
    const { data: clientUser } = await (supabaseAdmin
      .from("users") as any)
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();

    const { error } = await (supabaseAdmin
      .from("users") as any)
      .update({ status: "ACTIVE" })
      .eq("id", userId);

    if (error) {
      console.error("Failed to approve client status:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    // 3. Dispatch Telegram approval notification to client
    if (clientUser?.email) {
      try {
        const { sendNotificationAction } = await import("@/app/actions/notifications");
        await sendNotificationAction(
          clientUser.email,
          "🎉 Account Approved & Email Verified!",
          `Hello ${clientUser.name || "Client"},\n\nYour BoostBuddy account registration has been approved by the administrator and your email is verified!\n\nYou can now log into your account at https://boostbuddy.it`,
          "TELEGRAM",
          "SYSTEM",
          "HIGH"
        );
      } catch (err) {
        console.error("Failed to send approval telegram notification:", err);
      }
    }

    revalidatePath("/a/clients");
    revalidatePath("/a/dashboard");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in approveClientAndVerifyEmailAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}

/**
 * Mark client email as verified in Supabase Auth without changing status
 */
export async function verifyClientEmailAction(userId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();

    // Update Supabase Auth email confirmation
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (authError) {
      console.error("Failed to verify client email in Auth:", authError);
      return { success: false, error: authError.message };
    }

    // Update users table to keep in sync
    const { error: dbError } = await (supabaseAdmin
      .from("users") as any)
      .update({ email_verified: true })
      .eq("id", userId);

    if (dbError) {
      console.error("Failed to update email_verified in users table:", dbError);
      // Don't fail here since Auth update succeeded
    }

    revalidatePath("/a/clients");
    revalidatePath("/a/employees");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in verifyClientEmailAction:", e);
    return { success: false, error: e.message };
  }
}

export async function updateClientNotesAction(userId: string, notes: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();
    // Note: requires admin_notes column in users table
    const { error } = await (supabaseAdmin
      .from("users") as any)
      .update({ admin_notes: notes })
      .eq("id", userId);

    if (error) {
      console.error("Failed to update client notes:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    revalidatePath("/a/clients");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in updateClientNotesAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}

/**
 * Update user role action - ADMIN only
 * Allows changing a user's role between ADMIN, CLIENT, and EMPLOYEE
 */
export async function updateUserRoleAction(userId: string, newRole: 'ADMIN' | 'CLIENT' | 'EMPLOYEE') {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();

    // Update user role in Supabase
    const { error } = await (supabaseAdmin
      .from("users") as any)
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      console.error("Failed to update user role:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    revalidatePath("/a/clients");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in updateUserRoleAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}
