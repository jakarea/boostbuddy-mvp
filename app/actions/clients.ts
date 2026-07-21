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
    const { error: dbError } = await supabaseAdmin
      .from("users")
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
    revalidatePath("/admin/clients");
    
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
    .select("*")
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
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 means no rows returned
    console.error("Failed to fetch billing info:", error);
    throw new Error("Failed to fetch billing info");
  }
  return data || null;
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

  revalidatePath("/admin/clients");
  return { success: true };
}

export async function updateClientStatusAction(userId: string, status: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();

    // Fetch user details for notification
    const { data: clientUser } = await supabaseAdmin
      .from("users")
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("users")
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
          "SYSTEM"
        );
      } catch (err) {
        console.error("Failed to send approval telegram notification:", err);
      }
    }

    revalidatePath("/admin/clients");
    revalidatePath("/admin/dashboard");
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
    const { data: clientUser } = await supabaseAdmin
      .from("users")
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("users")
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
          "SYSTEM"
        );
      } catch (err) {
        console.error("Failed to send approval telegram notification:", err);
      }
    }

    revalidatePath("/admin/clients");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in approveClientAndVerifyEmailAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}

export async function updateClientNotesAction(userId: string, notes: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();
    // Note: requires admin_notes column in users table
    const { error } = await supabaseAdmin
      .from("users")
      .update({ admin_notes: notes })
      .eq("id", userId);

    if (error) {
      console.error("Failed to update client notes:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    revalidatePath("/admin/clients");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in updateClientNotesAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}
