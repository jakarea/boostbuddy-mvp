"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from '@/lib/auth/server-auth';

// ── Types ────────────────────────────────────────────────────────────

interface TelegramCredentials {
  bot_token: string;
  chat_id: string;
}

// ── Private helpers ──────────────────────────────────────────────────

/**
 * Determines default priority based on notification type
 */
function getDefaultPriority(type: string): "HIGH" | "MEDIUM" | "LOW" {
  const HIGH_PRIORITY_TYPES = [
    "CREDITS_ADJUSTED",
    "ORDER_ASSIGNED",
    "ORDER_CANCELLED",
    "ORDER_ACCEPTED",
    "REVIEW_APPROVED",
    "REVIEW_REJECTED",
    "ORDER_IN_PROGRESS"
  ];

  const LOW_PRIORITY_TYPES = [
    "SYSTEM",
    "INFO",
    "WEEKLY_SUMMARY",
    "MAINTENANCE"
  ];

  if (HIGH_PRIORITY_TYPES.includes(type)) return "HIGH";
  if (LOW_PRIORITY_TYPES.includes(type)) return "LOW";
  return "MEDIUM";
}

/**
 * Triggers Realtime notification for HIGH priority events
 * Uses Supabase Realtime to push instant updates to connected clients
 */
async function triggerRealtimeNotification(notification: {
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  type: string;
  priority: string;
  relatedOrderId?: string | null;
}) {
  try {
    // Supabase Realtime automatically pushes database INSERT events
    // The subscription on the client side will handle the rest
    // We just need to ensure the notification is stored with priority = HIGH
    console.log("[REALTIME] HIGH priority notification triggered for user:", notification.userId);
  } catch (error) {
    console.warn("[REALTIME] Failed to trigger notification:", error);
  }
}

/**
 * Loads admin-level Telegram credentials (DB config > env vars).
 * Returns null when neither source is configured.
 */
async function loadAdminTelegramCredentials(
  supabase: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>
): Promise<TelegramCredentials | null> {
  let botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
  let chatId = process.env.TELEGRAM_CHAT_ID ?? "";

  try {
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "telegram_bot")
      .maybeSingle();

    if (setting?.value) {
      botToken = (setting.value as any).bot_token || botToken;
      chatId = (setting.value as any).chat_id || chatId;
    }
  } catch {
    // app_settings table may not exist yet — fall back to env values
  }

  if (!botToken || !chatId) return null;
  return { bot_token: botToken, chat_id: chatId };
}

/**
 * Returns just the admin bot token (no chat ID) for per-user delivery.
 */
async function loadAdminBotToken(
  supabase: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  let botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";

  try {
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "telegram_bot")
      .maybeSingle();

    if (setting?.value) {
      botToken = (setting.value as any).bot_token || botToken;
    }
  } catch {
    // silently continue
  }

  return botToken || null;
}

/**
 * Looks up a user's personal Telegram chat ID by their email address.
 * Returns null if the user has not configured Telegram or table is missing.
 */
async function loadUserChatId(
  supabase: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>,
  recipientEmail: string
): Promise<string | null> {
  try {
    // Resolve email → user_id
    const { data: userRecord } = await supabase
      .from("users")
      .select("id")
      .eq("email", recipientEmail)
      .maybeSingle();

    if (!userRecord?.id) return null;

    // Fetch their personal chat ID
    const { data: telegramRecord } = await supabase
      .from("user_telegram_configs")
      .select("chat_id")
      .eq("user_id", userRecord.id)
      .maybeSingle();

    return telegramRecord?.chat_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Sends a Telegram message. Never throws — logs errors and returns silently.
 * NOTE: Now enabled for production use with multilingual support.
 */
async function dispatchToTelegram(
  credentials: TelegramCredentials | null,
  subject: string,
  body: string
): Promise<void> {
  if (!credentials) {
    console.warn("[TELEGRAM] No credentials configured - skipping delivery.");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${credentials.bot_token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.chat_id,
        text: `*${subject}*\n\n${body}`,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[TELEGRAM] API Error:", error?.description || "Unknown error");
    } else {
      console.log("[TELEGRAM] Message delivered successfully to:", credentials.chat_id);
    }
  } catch (error) {
    console.error("[TELEGRAM] Delivery failed:", error);
  }
}

// ── Public actions ───────────────────────────────────────────────────

export async function getNotificationsAction() {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("notification_logs")
      .select("id, recipient, subject, body, type, channel, status, priority, is_read, created_at, user_id, related_order_id")
      .order("created_at", { ascending: false });

    if (error && error.code !== "PGRST204") {
      if (error.code === "42P01") return { success: true, data: [] };
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    if (error?.code === "42P01") return { success: true, data: [] };
    return { success: false, error: error?.message || "Failed to fetch notifications" };
  }
}

/**
 * Sends a notification via the primary channel with smart routing.
 * Automatically routes based on recipient role:
 * - Admin: All admins receive same notification
 * - Employee: Single group notification (if configured)
 * - Client: Individual personal notification
 *
 * All deliveries are logged to notification_logs.
 */
export async function sendNotificationAction(
  recipient: string,
  subject: string,
  body: string,
  channel: "EMAIL" | "TELEGRAM",
  type: string,
  priority?: "HIGH" | "MEDIUM" | "LOW",
  relatedOrderId?: string
) {
  try {
    const supabaseAdmin = createAdminClient();

    // Resolve recipient email to user_id for proper user filtering
    let userId: string | null = null;
    let userRole: string | null = null;
    try {
      const { data: userRecord } = await supabaseAdmin
        .from("users")
        .select("id, role")
        .eq("email", recipient)
        .maybeSingle();
      userId = userRecord?.id || null;
      userRole = userRecord?.role || null;
    } catch (error) {
      console.warn("[NOTIFICATION] Could not resolve user_id:", error);
    }

    // Set default priority if not provided
    const notificationPriority = priority || getDefaultPriority(type);

    // Smart Telegram routing based on user role
    if (channel === "TELEGRAM") {
      const { routeTelegramNotificationAction } = await import("./telegram-routing");

      let targetUserType: "ADMIN" | "EMPLOYEE" | "CLIENT" = "CLIENT";
      if (userRole === "ADMIN") targetUserType = "ADMIN";
      else if (userRole === "EMPLOYEE") targetUserType = "EMPLOYEE";

      const telegramResult = await routeTelegramNotificationAction(
        targetUserType,
        subject,
        body,
        recipient, // Required for CLIENT notifications
        type,
        notificationPriority,
        relatedOrderId
      );

      console.log(`[NOTIFICATION] Telegram routing: ${targetUserType} → ${telegramResult.method} (${telegramResult.delivered} delivered)`);
    }

    // Log the notification with enhanced fields for priority system
    const { error } = await supabaseAdmin
      .from("notification_logs")
      .insert({
        recipient,
        subject,
        body,
        type,
        channel,
        status: "SENT",
        priority: notificationPriority,
        user_id: userId,
        related_order_id: relatedOrderId || null
      });

    if (error) {
      if (error.code === "42P01") return { success: true, note: "Table not created yet" };
      throw error;
    }

    // Trigger Realtime for HIGH priority notifications
    if (notificationPriority === "HIGH" && userId) {
      await triggerRealtimeNotification({
        userId,
        recipient,
        subject,
        body,
        type,
        priority: notificationPriority,
        relatedOrderId: relatedOrderId
      });
    }

    return { success: true, priority: notificationPriority };
  } catch (error: any) {
    console.error("Failed to process notification:", error);
    return { success: false, error: error?.message || "Failed to process notification" };
  }
}

/** Get notification logs addressed to the current logged-in client */
export async function getClientNotificationsAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success || !auth.user.email) return { success: false, error: "Unauthorized" };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notification_logs")
      .select("id, recipient, subject, body, type, channel, status, priority, is_read, created_at, related_order_id")
      .eq("user_id", auth.user.id)  // Use user_id for more efficient filtering
      .order("created_at", { ascending: false });
    if (error && error.code !== "PGRST204" && error.code !== "42P01") throw error;
    return { success: true, data: data || [] };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to fetch notifications";
    return { success: false, error: errorMsg };
  }
}

/**
 * Broadcast a notification to every active employee who is currently accepting orders.
 * Each recipient is delivered via sendNotificationAction (Telegram + log) wrapped in
 * its own try/catch so one failure does not abort the rest of the broadcast.
 * Returns the count of recipients the message was sent to.
 */
export async function broadcastToEmployeesAction(
  subject: string,
  body: string,
  type: string,
  priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM',
  relatedOrderId?: string
): Promise<{ success: boolean; sent: number; error?: string }> {
  try {
    let emails: string[] = [];

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("role", "EMPLOYEE")
      .eq("status", "ACTIVE")
      .eq("accepting_orders", true);

    if (error) throw error;
    emails = (data || []).map((u: any) => u.email).filter(Boolean);

    let sent = 0;
    for (const email of emails) {
      try {
        await sendNotificationAction(email, subject, body, "TELEGRAM", type, priority, relatedOrderId);
        sent++;
      } catch (recipientError) {
        // Per-recipient isolation: keep going even if one delivery fails.
        console.warn(`[broadcastToEmployees] Failed for ${email}:`, recipientError);
      }
    }

    return { success: true, sent };
  } catch (error: any) {
    return { success: false, sent: 0, error: error?.message || "Failed to broadcast to employees" };
  }
}

/**
 * Mark a notification as read by the current user
 */
export async function markNotificationAsReadAction(notificationId: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { error } = await supabase
      .from("notification_logs")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", auth.user.id);  // Security: only mark own notifications

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to mark notification as read" };
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsReadAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { error } = await supabase
      .from("notification_logs")
      .update({ is_read: true })
      .eq("user_id", auth.user.id)
      .eq("is_read", false);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to mark all notifications as read" };
  }
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadNotificationCountAction() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notification_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .eq("is_read", false);

    if (error) throw error;
    return { success: true, count: data || 0 };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to get unread count" };
  }
}

/**
 * Get notifications filtered by priority
 */
export async function getNotificationsByPriorityAction(priority: "HIGH" | "MEDIUM" | "LOW") {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notification_logs")
      .select("id, recipient, subject, body, type, channel, status, priority, is_read, created_at, related_order_id")
      .eq("user_id", auth.user.id)
      .eq("priority", priority)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch notifications" };
  }
}

/**
 * Delete a notification for the current user
 */
export async function deleteNotificationAction(notificationId: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { error } = await supabase
      .from("notification_logs")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", auth.user.id);  // Security: only delete own notifications

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete notification" };
  }
}

