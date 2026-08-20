/**
 * Batch Telegram Notification System
 *
 * Sends multiple Telegram messages in batches to avoid rate limits:
 * - Telegram limit: ~30 messages/second to different chats
 * - Same chat limit: ~20 messages/minute
 *
 * This implementation:
 * - Batches messages (10 per batch)
 * - Adds 1-second delay between batches
 * - Handles partial failures gracefully
 * - Returns detailed per-message results
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/server-auth';

// ── Types ────────────────────────────────────────────────────────────

export interface BatchMessage {
  recipientEmail?: string;       // For CLIENT type
  targetType?: "ADMIN" | "EMPLOYEE" | "CLIENT";
  subject: string;
  body: string;
  notificationType?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  relatedOrderId?: string;
  id?: string;                   // Optional tracking ID
}

export interface BatchResult {
  success: boolean;
  total: number;
  delivered: number;
  failed: number;
  batches: BatchResultItem[];
  duration: number;              // Total time in ms
  details?: {
    batchCount: number;
    messagesPerBatch: number;
    delayBetweenBatches: number;
  };
  error?: string;
}

export interface BatchResultItem {
  batchNumber: number;
  success: boolean;
  count: number;
  delivered: number;
  failed: number;
  failedIds: string[];
  duration: number;
  error?: string;
}

// ── Configuration ──────────────────────────────────────────────────────

const BATCH_CONFIG = {
  messagesPerBatch: 10,          // Safe: Telegram allows ~30/second
  delayBetweenBatches: 1000,     // 1 second delay between batches
  maxRetries: 2,                  // Retry failed batches
  retryDelay: 2000,               // 2 seconds before retry
  requestTimeout: 10000,          // 10 second timeout per request
};

// ── Helper Functions ──────────────────────────────────────────────────

/**
 * Load admin bot token
 */
async function loadBotToken(): Promise<string | null> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "telegram_bot")
      .maybeSingle();

    const appSettings = setting?.value
      ? JSON.parse(setting.value as string) as { bot_token?: string }
      : null;

    return appSettings?.bot_token || null;
  } catch (error) {
    console.error("[BATCH TELEGRAM] Failed to load bot token:", error);
    return null;
  }
}

/**
 * Get admin Telegram groups
 */
async function getAdminGroups(supabase: any): Promise<Array<{ group_name: string; group_chat_id: string }>> {
  try {
    const { data, error } = await supabase
      .from("telegram_group_configs")
      .select("group_name, group_chat_id")
      .eq("group_type", "ADMIN")
      .eq("is_active", true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[BATCH TELEGRAM] Failed to get admin groups:", error);
    return [];
  }
}

/**
 * Get employee group
 */
async function getEmployeeGroup(supabase: any): Promise<{ group_chat_id: string } | null> {
  try {
    const { data, error } = await supabase
      .from("telegram_group_configs")
      .select("group_chat_id")
      .eq("group_type", "EMPLOYEE")
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[BATCH TELEGRAM] Failed to get employee group:", error);
    return null;
  }
}

/**
 * Get user's Telegram chat ID
 */
async function getUserChatId(supabase: any, userEmail: string): Promise<string | null> {
  try {
    // Get user ID
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (!user?.id) return null;

    // Get chat ID
    const { data: telegramConfig } = await supabase
      .from("user_telegram_configs")
      .select("chat_id")
      .eq("user_id", user.id)
      .maybeSingle();

    return telegramConfig?.chat_id || null;
  } catch (error) {
    console.error("[BATCH TELEGRAM] Failed to get user chat ID:", error);
    return null;
  }
}

/**
 * Send single Telegram message
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BATCH_CONFIG.requestTimeout);

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `*${subject}*\n\n${body}`,
          parse_mode: "Markdown",
          disable_web_page_preview: true
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error?.description || "Telegram API error"
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error"
    };
  }
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send batch of messages
 */
async function sendBatch(
  botToken: string,
  batch: BatchMessage[],
  batchNumber: number,
  supabase: any
): Promise<BatchResultItem> {
  const startTime = Date.now();
  let delivered = 0;
  let failed = 0;
  const failedIds: string[] = [];
  const errors: string[] = [];

  console.log(`[BATCH TELEGRAM] Sending batch ${batchNumber} (${batch.length} messages)`);

  // Get target chats for each message type
  const adminGroups = await getAdminGroups(supabase);
  const employeeGroup = await getEmployeeGroup(supabase);

  for (const message of batch) {
    let success = false;
    let chatIds: string[] = [];

    // Determine target chat IDs based on message type
    switch (message.targetType) {
      case "ADMIN":
        // Send to all admin groups
        chatIds = adminGroups.map(g => g.group_chat_id);
        break;

      case "EMPLOYEE":
        // Send to employee group
        if (employeeGroup) {
          chatIds = [employeeGroup.group_chat_id];
        }
        break;

      case "CLIENT":
        if (message.recipientEmail) {
          const chatId = await getUserChatId(supabase, message.recipientEmail);
          if (chatId) chatIds = [chatId];
        }
        break;

      default:
        errors.push(`Unknown target type: ${message.targetType}`);
        break;
    }

    // Send to all target chats
    if (chatIds.length > 0) {
      let batchSuccess = true;

      for (const chatId of chatIds) {
        const result = await sendTelegramMessage(
          botToken,
          chatId,
          message.subject,
          message.body
        );

        if (!result.success) {
          batchSuccess = false;
          errors.push(`Failed to send "${message.subject}" to ${chatId}: ${result.error}`);
        }
      }

      success = batchSuccess;
    }

    // Track results
    if (success) {
      delivered++;
    } else {
      failed++;
      if (message.id) failedIds.push(message.id);
    }
  }

  const duration = Date.now() - startTime;
  const success = failed === 0;

  console.log(
    `[BATCH TELEGRAM] Batch ${batchNumber} completed: ${delivered} delivered, ${failed} failed (${duration}ms)`
  );

  if (errors.length > 0) {
    console.error(`[BATCH TELEGRAM] Batch ${batchNumber} errors:`, errors);
  }

  return {
    batchNumber,
    success,
    count: batch.length,
    delivered,
    failed,
    failedIds,
    duration,
    error: errors.length > 0 ? errors.join("; ") : undefined
  };
}

// ── Main Batch Function ────────────────────────────────────────────────

/**
 * Send batch Telegram notifications
 *
 * This function sends multiple messages in batches to avoid hitting Telegram's rate limits.
 * It handles partial failures gracefully and returns detailed results.
 *
 * @param messages - Array of messages to send
 * @returns Detailed batch results
 */
export async function batchTelegramNotificationsAction(
  messages: BatchMessage[]
): Promise<BatchResult> {
  const startTime = Date.now();
  const auth = await requireAuth({ role: 'ADMIN' });

  if (!auth.success) {
    return {
      success: false,
      total: messages.length,
      delivered: 0,
      failed: messages.length,
      batches: [],
      duration: 0,
      error: "Unauthorized - Admin only"
    };
  }

  if (messages.length === 0) {
    return {
      success: true,
      total: 0,
      delivered: 0,
      failed: 0,
      batches: [],
      duration: 0
    };
  }

  console.log(`[BATCH TELEGRAM] Starting batch send: ${messages.length} messages`);

  // Load bot token
  const botToken = await loadBotToken();
  if (!botToken) {
    return {
      success: false,
      total: messages.length,
      delivered: 0,
      failed: messages.length,
      batches: [],
      duration: Date.now() - startTime,
      error: "Telegram bot not configured"
    };
  }

  const supabaseAdmin = createAdminClient();
  const batches: BatchResultItem[] = [];
  let totalDelivered = 0;
  let totalFailed = 0;

  // Split into batches
  const messageBatches: BatchMessage[][] = [];
  for (let i = 0; i < messages.length; i += BATCH_CONFIG.messagesPerBatch) {
    messageBatches.push(messages.slice(i, i + BATCH_CONFIG.messagesPerBatch));
  }

  console.log(
    `[BATCH TELEGRAM] Split into ${messageBatches.length} batches of ${BATCH_CONFIG.messagesPerBatch} messages each`
  );

  // Send each batch with delay
  for (let i = 0; i < messageBatches.length; i++) {
    const batch = messageBatches[i];
    const batchNumber = i + 1;

    // Add retry logic for failed batches
    let attempt = 0;
    let batchResult: BatchResultItem | null = null;

    while (attempt <= BATCH_CONFIG.maxRetries && (!batchResult || !batchResult.success)) {
      if (attempt > 0) {
        console.log(`[BATCH TELEGRAM] Retrying batch ${batchNumber} (attempt ${attempt + 1}/${BATCH_CONFIG.maxRetries + 1})`);
        await sleep(BATCH_CONFIG.retryDelay);
      }

      batchResult = await sendBatch(botToken, batch, batchNumber, supabaseAdmin);
      attempt++;
    }

    if (batchResult) {
      batches.push(batchResult);
      totalDelivered += batchResult.delivered;
      totalFailed += batchResult.failed;
    }

    // Add delay between batches (except after the last batch)
    if (i < messageBatches.length - 1) {
      console.log(`[BATCH TELEGRAM] Waiting ${BATCH_CONFIG.delayBetweenBatches}ms before next batch...`);
      await sleep(BATCH_CONFIG.delayBetweenBatches);
    }
  }

  const duration = Date.now() - startTime;
  const success = totalFailed === 0 || totalDelivered > 0; // Success if all delivered OR partial success

  console.log(
    `[BATCH TELEGRAM] Batch send completed: ${totalDelivered}/${messages.length} delivered, ${totalFailed} failed (${duration}ms)`
  );

  return {
    success,
    total: messages.length,
    delivered: totalDelivered,
    failed: totalFailed,
    batches,
    duration,
    details: {
      batchCount: messageBatches.length,
      messagesPerBatch: BATCH_CONFIG.messagesPerBatch,
      delayBetweenBatches: BATCH_CONFIG.delayBetweenBatches
    }
  };
}

/**
 * Convenience function: Send notification to all admins in batch
 */
export async function sendAdminBatchNotificationAction(
  messages: Array<{ subject: string; body: string }>
): Promise<BatchResult> {
  const batchMessages: BatchMessage[] = messages.map(msg => ({
    targetType: "ADMIN",
    subject: msg.subject,
    body: msg.body,
    priority: "MEDIUM"
  }));

  return await batchTelegramNotificationsAction(batchMessages);
}

/**
 * Convenience function: Send notification to all employees in batch
 */
export async function sendEmployeeBatchNotificationAction(
  messages: Array<{ subject: string; body: string }>
): Promise<BatchResult> {
  const batchMessages: BatchMessage[] = messages.map(msg => ({
    targetType: "EMPLOYEE",
    subject: msg.subject,
    body: msg.body,
    priority: "HIGH" // Employee notifications are typically high priority
  }));

  return await batchTelegramNotificationsAction(batchMessages);
}

/**
 * Convenience function: Send notifications to multiple clients in batch
 */
export async function sendClientBatchNotificationAction(
  clientMessages: Array<{
    recipientEmail: string;
    subject: string;
    body: string;
  }>
): Promise<BatchResult> {
  const batchMessages: BatchMessage[] = clientMessages.map(msg => ({
    targetType: "CLIENT",
    recipientEmail: msg.recipientEmail,
    subject: msg.subject,
    body: msg.body,
    priority: "MEDIUM"
  }));

  return await batchTelegramNotificationsAction(batchMessages);
}
