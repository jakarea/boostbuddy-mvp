"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from '@/lib/auth/server-auth';

const SETTING_KEY = "telegram_bot";

export interface TelegramConfig {
  bot_token: string;
  chat_id: string;
}

/** Ensure the app_settings table exists (graceful no-op if it already does). */
async function ensureSettingsTable(supabase: Awaited<ReturnType<typeof createClient>>) {
  // We try a select — if the table doesn't exist Supabase returns error code 42P01
  const { error } = await supabase.from("app_settings").select("key").limit(1);
  return error?.code !== "42P01"; // true = table exists
}

/** Verify the caller is an admin. Returns the supabase client or throws. */
async function getAdminClient() {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) throw new Error(auth.error);
  return await createClient();
}

export async function getTelegramConfigAction(): Promise<{
  success: boolean;
  config?: TelegramConfig | null;
  error?: string;
}> {
  try {
    const supabase = await getAdminClient();
    const tableExists = await ensureSettingsTable(supabase);
    if (!tableExists) return { success: true, config: null };

    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", SETTING_KEY)
      .maybeSingle();

    if (error) throw error;
    return { success: true, config: data ? (data.value as TelegramConfig) : null };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to load config" };
  }
}

export async function saveTelegramConfigAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await getAdminClient();

    const bot_token = (formData.get("bot_token") as string)?.trim();
    const chat_id = (formData.get("chat_id") as string)?.trim();

    if (!bot_token || !chat_id) return { success: false, error: "Both fields are required." };

    const value: TelegramConfig = { bot_token, chat_id };

    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: SETTING_KEY, value }, { onConflict: "key" });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to save config" };
  }
}

export async function deleteTelegramConfigAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getAdminClient();
    const { error } = await supabase
      .from("app_settings")
      .delete()
      .eq("key", SETTING_KEY);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to remove config" };
  }
}

export async function sendTelegramTestAction(config: TelegramConfig): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Verify admin before performing external call
    await getAdminClient();

    const url = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chat_id,
        text: "✅ *BoostBuddy Test Notification*\n\nYour Telegram bot is configured and working correctly.",
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      return { success: false, error: body?.description ?? "Telegram API error" };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Network error" };
  }
}
