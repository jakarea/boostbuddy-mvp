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
 * NOTE: Telegram notifications are currently disabled for development.
 */
async function dispatchToTelegram(
  credentials: TelegramCredentials | null,
  subject: string,
  body: string
): Promise<void> {
  // TELEGRAM NOTIFICATIONS DISABLED
  console.info("[TELEGRAM] Notifications disabled - skipping delivery.");
  return;
}

// ── Public actions ───────────────────────────────────────────────────

export async function getNotificationsAction() {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return auth;

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("notification_logs")
      .select("*")
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
 * Sends a notification via the primary channel, then:
 * 1. Dispatches to the admin's global Telegram (if configured).
 * 2. Dispatches to the recipient's personal Telegram (if they configured one).
 * All deliveries are logged to notification_logs.
 */
export async function sendNotificationAction(
  recipient: string,
  subject: string,
  body: string,
  channel: "EMAIL" | "TELEGRAM",
  type: string
) {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Admin-level Telegram delivery (global admin channel)
    const adminCreds = await loadAdminTelegramCredentials(supabaseAdmin);
    await dispatchToTelegram(adminCreds, subject, body);

    // 2. Per-user personal Telegram delivery (uses admin's bot, user's chat ID)
    const botToken = await loadAdminBotToken(supabaseAdmin);
    if (botToken) {
      const userChatId = await loadUserChatId(supabaseAdmin, recipient);
      if (userChatId) {
        await dispatchToTelegram({ bot_token: botToken, chat_id: userChatId }, subject, body);
      }
    }

    // 3. Log the notification (primary channel record)
    const { error } = await supabaseAdmin
      .from("notification_logs")
      .insert({ recipient, subject, body, type, channel, status: "SENT" });

    if (error) {
      if (error.code === "42P01") return { success: true, note: "Table not created yet" };
      throw error;
    }

    return { success: true };
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
      .select("*")
      .eq("recipient", auth.user.email)
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
  type: string
): Promise<{ success: boolean; sent: number; error?: string }> {
  try {
    let emails: string[] = [];

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("role", "EMPLOYEE")
      .eq("is_active", true)
      .eq("accepting_orders", true);

    if (error) throw error;
    emails = (data || []).map((u: any) => u.email).filter(Boolean);

    let sent = 0;
    for (const email of emails) {
      try {
        await sendNotificationAction(email, subject, body, "TELEGRAM", type);
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

