"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/server-auth';

export async function getAdminOrdersAction() {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        users ( name, email ),
        services ( name ),
        profile_accounts ( profile_name )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch orders" };
  }
}

export async function getClientOrdersAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        services ( name ),
        profile_accounts ( profile_name )
      `)
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch client orders" };
  }
}

export async function fulfillOrder(
  userId: string,
  type: "PURCHASE" | "RENEWAL",
  amount: number,
  stripeSessionId: string,
  serviceId?: string,
  profileId?: string
) {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Create the order
    const orderPayload = {
      user_id: userId,
      service_id: serviceId || null,
      type,
      amount,
      status: "PAID",
      stripe_session_id: stripeSessionId,
      profile_account_id: profileId || null
    };

    const { error: orderError } = await supabaseAdmin.from("orders").insert(orderPayload);
    if (orderError) throw orderError;

    // Fetch target package duration
    let durationDays = 30;
    if (serviceId) {
      const { data: targetSrv } = await supabaseAdmin
        .from("services")
        .select("duration_days")
        .eq("id", serviceId)
        .single();
      if (targetSrv) {
        durationDays = targetSrv.duration_days;
      }
    }

    // 2. If it's a renewal, extend or reset the expiration date
    if (type === "RENEWAL" && profileId) {
      const { data: profile } = await supabaseAdmin
        .from("profile_accounts")
        .select("expiration_date, service_id")
        .eq("id", profileId)
        .single();
        
      if (profile) {
        let newExpirationDate = new Date();
        const now = new Date();
        const currentExpiration = profile.expiration_date ? new Date(profile.expiration_date) : null;

        if (profile.service_id && profile.service_id !== serviceId) {
          // Upgrade: Reset expiration to now + durationDays
          newExpirationDate.setDate(now.getDate() + durationDays);
        } else {
          // Standard renewal: extend current expiration (if active) or start from now
          const baseDate = currentExpiration && currentExpiration > now ? currentExpiration : now;
          newExpirationDate = new Date(baseDate.getTime());
          newExpirationDate.setDate(newExpirationDate.getDate() + durationDays);
        }
        
        await supabaseAdmin
          .from("profile_accounts")
          .update({ 
            expiration_date: newExpirationDate.toISOString().split('T')[0],
            service_id: serviceId || null,
            status: "ACTIVE"
          })
          .eq("id", profileId);

        // Fetch user email for notification
        const { data: userRecord } = await supabaseAdmin.from("users").select("email").eq("id", userId).single();

        const { sendNotificationAction } = await import("./notifications");
        
        await sendNotificationAction(
          userRecord?.email || userId,
          "Account Renewed/Upgraded",
          `Profile account ${profileId} has been successfully renewed/upgraded.`,
          "TELEGRAM",
          "RENEWAL"
        );
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Fulfillment failed:", error);
    return { success: false, error: error?.message || "Fulfillment failed" };
  }
}
