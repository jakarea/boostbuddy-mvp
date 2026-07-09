"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/server-auth';
import { revalidatePath } from "next/cache";

export async function getProfilesAction() {
  const supabase = await createClient();
  
  // Fetch profiles and join with users to get the assigned client name
  const { data, error } = await supabase
    .from("profile_accounts")
    .select(`
      *,
      users (
        name,
        email
      ),
      services (
        id,
        name,
        price,
        duration_days
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch profiles:", error);
    throw new Error("Failed to fetch profiles");
  }

  // Transform the payload slightly to normalize the nested user info for the UI
  return data.map((profile: any) => ({
    ...profile,
    client_name: profile.users?.name || "Unassigned",
    client_email: profile.users?.email || "",
    service_name: profile.services?.name || "",
    service_price: profile.services?.price || null,
    service_duration: profile.services?.duration_days || null
  }));
}

export async function getActiveClientsAction() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("role", "CLIENT")
    .eq("status", "ACTIVE")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch active clients:", error);
    throw new Error("Failed to fetch active clients");
  }

  return data;
}

export async function upsertProfileAction(formData: FormData, profileId?: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const payload = {
      profile_name: formData.get("profileName") as string,
      account_email: formData.get("accountEmail") as string,
      account_password: formData.get("accountPassword") as string,
      email_password: (formData.get("emailPassword") as string) || null,
      two_factor_secret: (formData.get("twoFactorSecret") as string) || null,
      ixbrowser_profile_id: (formData.get("ixBrowserProfileId") as string) || null,
      ixbrowser_group: (formData.get("ixBrowserGroup") as string) || null,
      admin_notes: (formData.get("adminNotes") as string) || null,
      client_notes: (formData.get("clientNotes") as string) || null,
      service_id: (formData.get("serviceId") as string) || null,
    };

    const supabaseAdmin = createAdminClient();
    let error;

    if (profileId) {
      const { error: updateError } = await supabaseAdmin
        .from("profile_accounts")
        .update(payload)
        .eq("id", profileId);
      error = updateError;
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("profile_accounts")
        .insert({ ...payload, status: 'AVAILABLE' });
      error = insertError;
    }

    if (error) {
      console.error("Failed to save profile:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    revalidatePath("/admin/profiles");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in upsertProfileAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}

export async function assignProfileAction(profileId: string, clientId: string, expirationDate: string, serviceId?: string, assignmentDate?: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const payload = {
      assigned_client_id: clientId,
      expiration_date: expirationDate,
      assignment_date: assignmentDate || new Date().toISOString().split("T")[0],
      status: "ACTIVE",
      service_id: serviceId || null,
    };

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("profile_accounts")
      .update(payload)
      .eq("id", profileId);

    if (error) {
      console.error("Failed to assign profile:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    revalidatePath("/admin/profiles");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in assignProfileAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}

export async function unassignProfileAction(profileId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const payload = {
      assigned_client_id: null,
      expiration_date: null,
      assignment_date: null,
      status: "AVAILABLE",
      service_id: null,
    };

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("profile_accounts")
      .update(payload)
      .eq("id", profileId);

    if (error) {
      console.error("Failed to unassign profile:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    revalidatePath("/admin/profiles");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in unassignProfileAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}

export async function deleteProfileAction(profileId: string) {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("profile_accounts")
      .delete()
      .eq("id", profileId);

    if (error) {
      console.error("Failed to delete profile:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    revalidatePath("/admin/profiles");
    return { success: true };
  } catch (e: any) {
    console.error("Exception in deleteProfileAction:", e);
    return { success: false, error: `Server error: ${e.message}` };
  }
}
