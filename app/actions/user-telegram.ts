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

    // Restrict Telegram configuration to clients and admins only
    if (auth.user.role === "EMPLOYEE") {
      return {
        success: false,
        error: "Telegram configuration is not available for employees. Employees receive notifications through the configured employee group."
      };
    }

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

/** Save (upsert) the current user's personal Telegram chat ID with comprehensive bot ID validation */
export async function saveUserTelegramConfigAction(chatId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    // Restrict Telegram configuration to clients and admins only
    if (auth.user.role === "EMPLOYEE") {
      return {
        success: false,
        error: "Telegram configuration is not available for employees. Employees receive notifications through the configured employee group."
      };
    }

    const supabase = await createClient();
    const trimmed = chatId.trim();
    if (!trimmed) return { success: false, error: "Chat ID is required." };

    // Get bot token for validation
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "telegram_bot")
      .maybeSingle();

    // Type-safe access to app_settings value
    const appSettings = setting?.value ? JSON.parse(setting.value as string) as { bot_token?: string } : null;
    const botToken = appSettings?.bot_token;
    if (!botToken) {
      return {
        success: false,
        error: "Telegram bot is not configured. Please contact your administrator to set up Telegram first."
      };
    }

    // Extract bot ID from token
    const botId = botToken.split(":")[0]?.trim();

    // Multiple validation checks to prevent bot ID from being saved
    const validationResult = await validateChatIdNotBot(trimmed, botId, botToken);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.error || "The Chat ID appears to be a bot ID. Please enter your personal Telegram Chat ID from @userinfobot or @GetMyChatID_Bot."
      };
    }

    // Additional safety: verify the Chat ID by attempting to get chat info
    const apiValidationResult = await validateChatIdViaAPI(trimmed, botToken);
    if (!apiValidationResult.isValid) {
      return {
        success: false,
        error: apiValidationResult.error || "Invalid Chat ID. Please verify your personal Telegram Chat ID."
      };
    }

    // If all validations passed, save the Chat ID
    const { error } = await supabase
      .from("user_telegram_configs")
      .upsert({ user_id: auth.user.id, chat_id: trimmed }, { onConflict: "user_id" });

    if (error) throw error;

    console.log(`[TELEGRAM CONFIG] Chat ID validated and saved for user ${auth.user.email}`);
    return { success: true };

  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to save config" };
  }
}

/**
 * Comprehensive validation to ensure Chat ID is not a bot ID
 */
async function validateChatIdNotBot(
  chatId: string,
  configuredBotId: string,
  botToken: string
): Promise<{ isValid: boolean; error?: string }> {
  const errors: string[] = [];

  // Check 1: Direct match with configured bot ID
  if (chatId === configuredBotId) {
    return {
      isValid: false,
      error: "The entered ID is the Telegram Bot's ID. Please get your personal Chat ID from @userinfobot."
    };
  }

  // Check 2: Bot ID patterns
  // Bot IDs are typically 7-10 digits, personal Chat IDs can vary more
  const botIdPattern = /^\d{7,10}$/;
  if (botIdPattern.test(chatId) && chatId === configuredBotId) {
    return {
      isValid: false,
      error: "This appears to be a bot ID format. Please enter your personal Chat ID."
    };
  }

  // Check 3: Negative numbers (indicates groups/channels, not personal user)
  if (chatId.startsWith('-')) {
    return {
      isValid: false,
      error: "Group Chat IDs (starting with -) cannot be used for personal notifications. Please enter your personal user Chat ID."
    };
  }

  // Check 4: Very large numbers (likely not personal)
  const numericId = parseInt(chatId.replace(/[^0-9]/g, ''));
  if (numericId > 2147483647) { // Max int32
    return {
      isValid: false,
      error: "Invalid Chat ID format. Personal Chat IDs should be smaller numbers."
    };
  }

  // Check 5: Common bot ID ranges (Telegram bot IDs typically start with specific ranges)
  // This is a heuristic check
  if (chatId.length >= 7 && chatId.length <= 10 && /^\d+$/.test(chatId)) {
    // Could be a bot ID, need API verification
    const botCheckResult = await checkIfBotViaAPI(chatId, botToken);
    if (!botCheckResult.isValid) {
      return botCheckResult;
    }
  }

  return { isValid: true };
}

/**
 * Use Telegram API to check if a Chat ID belongs to a bot
 */
async function checkIfBotViaAPI(
  chatId: string,
  botToken: string
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Use getChat API to check if the Chat ID is valid and not a bot
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`
    );

    if (!response.ok) {
      // If API call fails, it might be an invalid Chat ID
      const body = await response.json();
      return {
        isValid: false,
        error: `Invalid Chat ID: ${body?.description || "Unknown error"}`
      };
    }

    const body = await response.json();

    if (!body.ok) {
      return {
        isValid: false,
        error: `Invalid Chat ID: ${body.description || "Could not verify Chat ID"}`
      };
    }

    // Check if the chat is a bot
    if (body.result?.type === 'bot' || body.result?.type === 'private' && body.result?.username?.endsWith('bot')) {
      return {
        isValid: false,
        error: "This Chat ID belongs to a bot account. Please enter your personal user Chat ID from @userinfobot."
      };
    }

    return { isValid: true };

  } catch (error) {
    // If API check fails, we'll allow it but warn in logs
    console.warn('[TELEGRAM VALIDATION] API check failed, allowing Chat ID:', error);
    return { isValid: true };
  }
}

/**
 * Validate Chat ID by attempting to get basic info
 */
async function validateChatIdViaAPI(
  chatId: string,
  botToken: string
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Try to get chat info to verify the Chat ID is valid
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`
    );

    if (!response.ok) {
      const body = await response.json();
      const desc = body?.description || "";

      // Specific error messages for invalid Chat IDs
      if (desc.includes('chat not found') || desc.includes('invalid') || desc.includes('bot was blocked')) {
        return {
          isValid: false,
          error: `Invalid Chat ID: ${desc}. Please get your personal Chat ID from @userinfobot.`
        };
      }

      return {
        isValid: false,
        error: `Could not verify Chat ID: ${desc}`
      };
    }

    const body = await response.json();

    if (!body.ok) {
      return {
        isValid: false,
        error: `Chat ID verification failed: ${body.description || "Unknown error"}`
      };
    }

    // Additional validation: ensure it's a personal chat
    const chatType = body.result?.type;
    if (chatType === 'channel' || chatType === 'supergroup' || chatType === 'group') {
      return {
        isValid: false,
        error: `Group/Channel Chat IDs cannot be used for personal notifications. Please enter your personal user Chat ID.`
      };
    }

    return { isValid: true };

  } catch (error) {
    console.error('[TELEGRAM VALIDATION] API validation error:', error);
    return {
      isValid: false,
      error: "Could not validate Chat ID. Please verify you entered the correct personal Chat ID."
    };
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

    // Restrict Telegram configuration to clients and admins only
    if (auth.user.role === "EMPLOYEE") {
      return {
        success: false,
        error: "Telegram configuration is not available for employees. Employees receive notifications through the configured employee group."
      };
    }

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

    // Restrict Telegram configuration to clients and admins only
    if (auth.user.role === "EMPLOYEE") {
      return {
        success: false,
        error: "Telegram configuration is not available for employees. Employees receive notifications through the configured employee group."
      };
    }

    if (!auth.success) {
      return { success: false, error: "Authentication failed" };
    }

    const user = (auth as any).user;
    const supabase = await createClient();

    // Load user's chat ID
    const { data: userConfig } = await supabase
      .from("user_telegram_configs")
      .select("chat_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!userConfig?.chat_id) return { success: false, error: "No Telegram chat ID configured." };

    // Load admin's bot token
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "telegram_bot")
      .maybeSingle();

    const appSettings = setting?.value ? JSON.parse(setting.value as string) as { bot_token?: string } : null;
    const botToken = appSettings?.bot_token;
    if (!botToken) return { success: false, error: "Admin Telegram bot is not configured yet. Please configure it in the Admin panel." };

    const botId = botToken.split(":")[0]?.trim();
    if (botId && userConfig?.chat_id?.trim() === botId) {
      return {
        success: false,
        error: "Your configured Chat ID is the Bot's ID, not your personal Telegram Chat ID. Please update it using @userinfobot.",
      };
    }

    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: userConfig?.chat_id,
          text: "✅ *BoostBuddy*\n\nYour personal Telegram notifications are set up correctly!",
          parse_mode: "Markdown",
        }),
      }
    );

    if (!res.ok) {
      const body = await res.json();
      const desc = body?.description ?? "";
      if (desc.includes("bot can't send messages to the bot") || desc.includes("bot can't send messages to bots")) {
        return {
          success: false,
          error: "The entered Chat ID belongs to a bot. Please enter your personal Telegram Chat ID (get it from @userinfobot).",
        };
      }
      if (desc.includes("bot was blocked by the user") || desc.includes("chat not found")) {
        return {
          success: false,
          error: "Telegram could not send message. Please open your Telegram bot and click 'Start' first.",
        };
      }
      return { success: false, error: desc || "Telegram API error" };
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

    // Restrict Telegram configuration to clients and admins only
    if (auth.user.role === "EMPLOYEE") {
      return {
        success: false,
        error: "Telegram configuration is not available for employees. Employees receive notifications through the configured employee group."
      };
    }

    const supabase = await createClient();
    const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "telegram_bot").maybeSingle();
    const appSettings = setting?.value ? JSON.parse(setting.value as string) as { bot_token?: string } : null;
    const botToken = appSettings?.bot_token;
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
