"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from '@/lib/auth/server-auth';

export interface UserTelegramConfig {
  chat_id: string;
}

/** Get the current user's personal Telegram chat ID */
export async function getUserTelegramConfigAction(): Promise<{
  success: boolean;
  config?: UserTelegramConfig | null;
  error?: string;
}> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_telegram_configs")
      .select("chat_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error?.code === "42P01") return { success: true, config: null };
    if (error) throw error;

    return { success: true, config: data ? { chat_id: data.chat_id } : null };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to load config" };
  }
}

/** Save (upsert) the current user's personal Telegram chat ID */
export async function saveUserTelegramConfigAction(chatId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const trimmed = chatId.trim();
    if (!trimmed) return { success: false, error: "Chat ID is required." };

    const { error } = await supabase
      .from("user_telegram_configs")
      .upsert({ user_id: auth.user.id, chat_id: trimmed }, { onConflict: "user_id" });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to save config" };
  }
}

/** Remove the current user's personal Telegram config */
export async function deleteUserTelegramConfigAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();
    const { error } = await supabase
      .from("user_telegram_configs")
      .delete()
      .eq("user_id", auth.user.id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to remove config" };
  }
}

/** Send a test Telegram message to the current user using the admin's bot */
export async function sendUserTelegramTestAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();

    // Load user's chat ID
    const { data: userConfig } = await supabase
      .from("user_telegram_configs")
      .select("chat_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!userConfig?.chat_id) return { success: false, error: "No Telegram chat ID configured." };

    // Load admin's bot token
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "telegram_bot")
      .maybeSingle();

    const botToken = (setting?.value as any)?.bot_token ?? process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return { success: false, error: "Admin Telegram bot is not configured yet." };

    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: userConfig.chat_id,
          text: "✅ *BoostBuddy*\n\nYour personal Telegram notifications are set up correctly!",
          parse_mode: "Markdown",
        }),
      }
    );

    if (!res.ok) {
      const body = await res.json();
      return { success: false, error: body?.description ?? "Telegram API error" };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Network error" };
  }
}

/** Get the username of the Telegram bot from app settings or environment variables */
export async function getTelegramBotUsernameAction(): Promise<{
  success: boolean;
  username?: string;
  error?: string;
}> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();
    const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "telegram_bot").maybeSingle();
    const botToken = (setting?.value as any)?.bot_token ?? process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return { success: true };

    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    if (!res.ok) return { success: true };
    const body = await res.json();
    return { success: true, username: body?.result?.username };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load bot username";
    return { success: false, error: errorMsg };
  }
}
