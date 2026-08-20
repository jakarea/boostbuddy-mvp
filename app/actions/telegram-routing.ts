/**
 * Telegram Notification Routing System with Fallback Handling
 * Implements specific routing rules with graceful degradation:
 * - Admin: All admins receive same notification → fallback to web if no Telegram
 * - Employee: Single group notification → fallback to web if no group
 * - Client: Individual personal notification → fallback to web if no Chat ID
 *
 * ENHANCED: Now supports rich formatting with HTML and inline buttons
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from '@/lib/auth/server-auth';
import { formatRichTelegramMessage, RichTelegramMessage } from './telegram-rich-format';

// ── Types ────────────────────────────────────────────────────────────

export interface TelegramRouteConfig {
  targetType: "ADMIN" | "EMPLOYEE" | "CLIENT";
  adminGroups?: string[];
  employeeGroup?: string;
  recipientEmail?: string;
}

interface TelegramCredentials {
  bot_token: string;
  chat_id: string;
}

interface RoutingResult {
  success: boolean;
  delivered: number;
  failed: number;
  method: string;
  telegramUsed: boolean;
  webFallbackUsed: boolean;
  details?: any;
  error?: string;
  fallbackReason?: string;
}

// ── Helper Functions ──────────────────────────────────────────────────

/**
 * Load admin bot token for sending messages
 * Uses only UI configuration from Admin panel
 */
async function loadAdminBotToken(supabase: any): Promise<string | null> {
  try {
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "telegram_bot")
      .maybeSingle();

    // Type-safe access to app_settings value
    const appSettings = setting?.value ? JSON.parse(setting.value as string) as { bot_token?: string } : null;
    const botToken = appSettings?.bot_token;
    return botToken || null;
  } catch (error) {
    console.warn("[TELEGRAM ROUTING] Could not load bot token from app_settings:", error);
    return null;
  }
}

/**
 * Get all admin users for broadcast
 */
async function getAllAdminUsers(supabase: any): Promise<Array<{ id: string; email: string; name: string }>> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name")
      .eq("role", "ADMIN")
      .eq("status", "ACTIVE");  // Fixed: use 'status' column with String value instead of non-existent 'isActive' Boolean

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[TELEGRAM ROUTING] Failed to get admin users:", error);
    return [];
  }
}

/**
 * Get admin Telegram groups
 */
async function getAdminGroups(supabase: any): Promise<TelegramGroupConfig[]> {
  try {
    const { data, error } = await supabase
      .from("telegram_group_configs")
      .select("*")
      .eq("group_type", "ADMIN")
      .eq("is_active", true);

    if (error) {
      if (error.code === "42P01") return [];
      throw error;
    }
    return data || [];
  } catch (error) {
    console.warn("[TELEGRAM ROUTING] Could not load admin groups:", error);
    return [];
  }
}

/**
 * Get employee Telegram group
 */
async function getEmployeeGroup(supabase: any): Promise<TelegramGroupConfig | null> {
  try {
    const { data, error } = await supabase
      .from("telegram_group_configs")
      .select("*")
      .eq("group_type", "EMPLOYEE")
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") return null;
      throw error;
    }
    return data;
  } catch (error) {
    console.warn("[TELEGRAM ROUTING] Could not load employee group:", error);
    return null;
  }
}

/**
 * Get client's personal Telegram Chat ID
 */
async function getClientChatId(supabase: any, userEmail: string): Promise<string | null> {
  try {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (!user?.id) return null;

    const { data: telegramConfig } = await supabase
      .from("user_telegram_configs")
      .select("chat_id")
      .eq("user_id", user.id)
      .maybeSingle();

    return telegramConfig?.chat_id || null;
  } catch (error) {
    console.warn("[TELEGRAM ROUTING] Could not get client Chat ID:", error);
    return null;
  }
}

/**
 * Send message to a specific Telegram chat
 * Enhanced with rich formatting support (HTML + inline buttons)
 */
async function sendToTelegramChat(
  botToken: string,
  chatId: string,
  subject: string,
  message: string,
  richMessage?: RichTelegramMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    let payload: any;

    if (richMessage) {
      // Use rich formatting with HTML and buttons
      const { text, reply_markup } = formatRichTelegramMessage(richMessage);
      payload = {
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
        reply_markup: reply_markup
      };
    } else {
      // Legacy format (Markdown)
      payload = {
        chat_id: chatId,
        text: `*${subject}*\n\n${message}`,
        parse_mode: "Markdown",
        disable_web_page_preview: true
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error?.description || "Unknown Telegram API error"
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

interface TelegramGroupConfig {
  id: string;
  group_name: string;
  group_chat_id: string;
  group_type: string;
  is_active: boolean;
}

// ── Public Routing Functions with Fallback Handling ────────────────────

/**
 * Route notification with automatic fallback handling
 *
 * Fallback Strategy:
 * 1. Try Telegram delivery based on user type
 * 2. If Telegram not configured/fails → Web notifications (database logging)
 * 3. Always log to database regardless of delivery method
 * 4. Never fail the notification - always have a fallback
 */
export async function routeTelegramNotificationAction(
  targetUserType: "ADMIN" | "EMPLOYEE" | "CLIENT",
  subject: string,
  message: string,
  recipientEmail?: string,
  notificationType?: string,
  priority?: "HIGH" | "MEDIUM" | "LOW",
  relatedOrderId?: string
): Promise<RoutingResult> {
  try {
    const supabaseAdmin = createAdminClient();
    const botToken = await loadAdminBotToken(supabaseAdmin);

    // Initialize result
    let result: RoutingResult = {
      success: false,
      delivered: 0,
      failed: 0,
      method: "none",
      telegramUsed: false,
      webFallbackUsed: false,
      details: []
    };

    // Check if Telegram is configured at all
    const telegramConfigured = !!botToken;

    if (!telegramConfigured) {
      console.warn("[TELEGRAM ROUTING] Bot not configured - using web fallback");
      result.fallbackReason = "Telegram bot not configured";
      result.webFallbackUsed = true;
      result.method = "web_fallback";

      // Still log and process, just without Telegram
      await logNotification(supabaseAdmin, {
        targetType: targetUserType,
        recipient: recipientEmail || targetUserType,
        subject,
        body: message,
        type: notificationType || "TELEGRAM_NOTIFICATION",
        priority: priority || "MEDIUM",
        relatedOrderId,
        delivered: 0,
        failed: 0,
        method: "web_fallback",
        telegramConfigured: false
      });

      return {
        ...result,
        success: true, // Still successful - web notifications will work
        details: [{ note: "Telegram not configured, using web notifications only" }]
      };
    }

    // Process based on user type
    switch (targetUserType) {
      case "ADMIN":
        result = await sendToAllAdmins(supabaseAdmin, botToken, subject, message);
        break;

      case "EMPLOYEE":
        result = await sendToEmployeeGroup(supabaseAdmin, botToken, subject, message);
        break;

      case "CLIENT":
        if (!recipientEmail) {
          return {
            success: false,
            delivered: 0,
            failed: 0,
            method: "error",
            telegramUsed: false,
            webFallbackUsed: false,
            error: "Recipient email required for client notifications"
          };
        }
        result = await sendToIndividualClient(supabaseAdmin, botToken, recipientEmail, subject, message);
        break;

      default:
        return {
          success: false,
          delivered: 0,
          failed: 0,
          method: "error",
          telegramUsed: false,
          webFallbackUsed: false,
          error: `Unknown target type: ${targetUserType}`
        };
    }

    // Always log to database regardless of delivery method
    await logNotification(supabaseAdmin, {
      targetType: targetUserType,
      recipient: recipientEmail || targetUserType,
      subject,
      body: message,
      type: notificationType || "TELEGRAM_NOTIFICATION",
      priority: priority || "MEDIUM",
      relatedOrderId,
      delivered: result.delivered,
      failed: result.failed,
      method: result.method,
      telegramConfigured: true
    });

    // Success if any delivery happened OR if web fallback will work
    const success = result.delivered > 0 || result.webFallbackUsed;

    return {
      ...result,
      success,
      telegramUsed: result.delivered > 0,
      webFallbackUsed: result.delivered === 0
    };

  } catch (error) {
    console.error("[TELEGRAM ROUTING] Critical error:", error);
    return {
      success: true, // Don't fail - web notifications still work
      delivered: 0,
      failed: 0,
      method: "web_fallback",
      telegramUsed: false,
      webFallbackUsed: true,
      fallbackReason: "Critical error in Telegram routing",
      error: error instanceof Error ? error.message : "Unknown error",
      details: [{ note: "Telegram routing failed, using web notifications" }]
    };
  }
}

/**
 * Send notification to all admins with fallback handling
 */
async function sendToAllAdmins(
  supabase: any,
  botToken: string,
  subject: string,
  message: string
): Promise<RoutingResult> {
  const details = [];
  let delivered = 0;
  let failed = 0;
  let webFallbackUsed = false;

  // 1. Try admin groups
  const adminGroups = await getAdminGroups(supabase);

  if (adminGroups.length === 0) {
    console.warn("[TELEGRAM ROUTING] No admin groups configured - will try individual admins");
    details.push({ warning: "No admin groups configured" });
  }

  for (const group of adminGroups) {
    const result = await sendToTelegramChat(botToken, group.group_chat_id, subject, message);
    details.push({
      type: "admin_group",
      name: group.group_name,
      success: result.success,
      error: result.error
    });

    if (result.success) {
      delivered++;
      console.log(`[TELEGRAM ROUTING] ✅ Sent to admin group: ${group.group_name}`);
    } else {
      failed++;
      console.error(`[TELEGRAM ROUTING] ❌ Failed to send to admin group: ${group.group_name}`);
    }
  }

  // 2. Try individual admin users
  const adminUsers = await getAllAdminUsers(supabase);
  let personalDelivered = 0;

  for (const adminUser of adminUsers) {
    const adminChatId = await getClientChatId(supabase, adminUser.email);
    if (adminChatId) {
      const result = await sendToTelegramChat(botToken, adminChatId, subject, message);
      details.push({
        type: "admin_personal",
        name: adminUser.name,
        email: adminUser.email,
        success: result.success,
        error: result.error
      });

      if (result.success) {
        delivered++;
        personalDelivered++;
        console.log(`[TELEGRAM ROUTING] ✅ Sent to admin: ${adminUser.name}`);
      } else {
        failed++;
        console.error(`[TELEGRAM ROUTING] ❌ Failed to send to admin: ${adminUser.name}`);
      }
    } else {
      details.push({
        type: "admin_personal",
        name: adminUser.name,
        email: adminUser.email,
        success: false,
        note: "No Chat ID configured"
      });
    }
  }

  // 3. Check if we need web fallback
  if (delivered === 0) {
    console.warn("[TELEGRAM ROUTING] No admin Telegram delivery - web fallback will handle");
    webFallbackUsed = true;
    details.push({ fallback: "Web notifications will be used" });
  }

  const method = adminGroups.length > 0 ? "admin_groups" : "admin_personal";

  return {
    success: delivered > 0,
    delivered,
    failed,
    method: method + (adminUsers.length > 0 ? "+personal" : ""),
    telegramUsed: delivered > 0,
    webFallbackUsed,
    details
  };
}

/**
 * Send notification to employee group with fallback handling
 */
async function sendToEmployeeGroup(
  supabase: any,
  botToken: string,
  subject: string,
  message: string
): Promise<RoutingResult> {
  const details = [];
  let delivered = 0;
  let failed = 0;
  let webFallbackUsed = false;

  const employeeGroup = await getEmployeeGroup(supabase);

  if (!employeeGroup) {
    console.warn("[TELEGRAM ROUTING] No employee group configured - web fallback will handle");
    details.push({
      warning: "No employee group configured",
      fallback: "Web notifications will be used"
    });

    return {
      success: false,
      delivered: 0,
      failed: 0,
      method: "web_fallback",
      telegramUsed: false,
      webFallbackUsed: true,
      fallbackReason: "No employee group configured",
      details
    };
  }

  const result = await sendToTelegramChat(botToken, employeeGroup.group_chat_id, subject, message);

  details.push({
    type: "employee_group",
    name: employeeGroup.group_name,
    success: result.success,
    error: result.error
  });

  if (result.success) {
    delivered++;
    console.log(`[TELEGRAM ROUTING] ✅ Sent to employee group: ${employeeGroup.group_name}`);
  } else {
    failed++;
    console.error(`[TELEGRAM ROUTING] ❌ Failed to send to employee group: ${employeeGroup.group_name}`);

    // If Telegram delivery fails, web fallback handles it
    webFallbackUsed = true;
    details.push({ fallback: "Web notifications will be used" });
  }

  return {
    success: delivered > 0,
    delivered,
    failed,
    method: "employee_group",
    telegramUsed: delivered > 0,
    webFallbackUsed,
    details
  };
}

/**
 * Send notification to individual client with fallback handling
 */
async function sendToIndividualClient(
  supabase: any,
  botToken: string,
  recipientEmail: string,
  subject: string,
  message: string
): Promise<RoutingResult> {
  const details = [];
  let delivered = 0;
  let failed = 0;
  let webFallbackUsed = false;

  const clientChatId = await getClientChatId(supabase, recipientEmail);

  if (!clientChatId) {
    console.warn(`[TELEGRAM ROUTING] No Chat ID configured for client: ${recipientEmail} - web fallback will handle`);
    details.push({
      email: recipientEmail,
      warning: "No Chat ID configured for this client",
      fallback: "Web notifications will be used"
    });

    return {
      success: false,
      delivered: 0,
      failed: 0,
      method: "web_fallback",
      telegramUsed: false,
      webFallbackUsed: true,
      fallbackReason: `No Chat ID configured for ${recipientEmail}`,
      details
    };
  }

  const result = await sendToTelegramChat(botToken, clientChatId, subject, message);

  details.push({
    type: "client_personal",
    email: recipientEmail,
    chatId: clientChatId,
    success: result.success,
    error: result.error
  });

  if (result.success) {
    delivered++;
    console.log(`[TELEGRAM ROUTING] ✅ Sent to client: ${recipientEmail}`);
  } else {
    failed++;
    console.error(`[TELEGRAM ROUTING] ❌ Failed to send to client: ${recipientEmail}`);

    // If Telegram delivery fails, web fallback handles it
    webFallbackUsed = true;
    details.push({ fallback: "Web notifications will be used" });
  }

  return {
    success: delivered > 0,
    delivered,
    failed,
    method: "client_personal",
    telegramUsed: delivered > 0,
    webFallbackUsed,
    details
  };
}

/**
 * Log notification to database (always happens regardless of delivery method)
 */
async function logNotification(
  supabase: any,
  notificationData: {
    targetType: string;
    recipient: string;
    subject: string;
    body: string;
    type: string;
    priority: string;
    relatedOrderId?: string;
    delivered: number;
    failed: number;
    method: string;
    telegramConfigured?: boolean;
  }
) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return;

    await supabase
      .from("notification_logs")
      .insert({
        user_id: auth.user.id,
        recipient: notificationData.recipient,
        subject: notificationData.subject,
        body: notificationData.body,
        type: notificationData.type,
        channel: "TELEGRAM",
        status: notificationData.delivered > 0 ? "SENT" : "WEB_FALLBACK",
        priority: notificationData.priority,
        related_order_id: notificationData.relatedOrderId || null
      });

    console.log(`[TELEGRAM ROUTING] Notification logged: ${notificationData.delivered} Telegram delivered, web fallback ${notificationData.delivered === 0 ? 'active' : 'backup'}`);
  } catch (error) {
    console.error("[TELEGRAM ROUTING] Failed to log notification:", error);
  }
}

// ── Convenience Functions ────────────────────────────────────────────────

/**
 * Send admin notification with fallback
 */
export async function sendAdminNotificationAction(
  subject: string,
  message: string,
  notificationType?: string,
  priority?: "HIGH" | "MEDIUM" | "LOW",
  relatedOrderId?: string
): Promise<RoutingResult> {
  return await routeTelegramNotificationAction(
    "ADMIN",
    subject,
    message,
    undefined,
    notificationType,
    priority,
    relatedOrderId
  );
}

/**
 * Send employee notification with fallback
 */
export async function sendEmployeeNotificationAction(
  subject: string,
  message: string,
  notificationType?: string,
  priority?: "HIGH" | "MEDIUM" | "LOW",
  relatedOrderId?: string
): Promise<RoutingResult> {
  return await routeTelegramNotificationAction(
    "EMPLOYEE",
    subject,
    message,
    undefined,
    notificationType,
    priority,
    relatedOrderId
  );
}

/**
 * Send client notification with fallback
 */
export async function sendClientNotificationAction(
  clientEmail: string,
  subject: string,
  message: string,
  notificationType?: string,
  priority?: "HIGH" | "MEDIUM" | "LOW",
  relatedOrderId?: string
): Promise<RoutingResult> {
  return await routeTelegramNotificationAction(
    "CLIENT",
    subject,
    message,
    clientEmail,
    notificationType,
    priority,
    relatedOrderId
  );
}

/**
 * Get Telegram routing configuration status
 */
export async function getTelegramRoutingStatusAction(): Promise<{
  success: boolean;
  config?: {
    botConfigured: boolean;
    adminGroups: number;
    adminGroupNames: string[];
    employeeGroupConfigured: boolean;
    employeeGroupName?: string;
    clientsWithChatId: number;
    totalAdmins: number;
    adminsWithChatId: number;
    systemReady: boolean;
  };
  error?: string;
}> {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();

    // Check bot configuration
    const botToken = await loadAdminBotToken(supabaseAdmin);

    // Check admin groups
    const adminGroups = await getAdminGroups(supabaseAdmin);
    const adminGroupNames = adminGroups.map(g => g.group_name);

    // Check employee group
    const employeeGroup = await getEmployeeGroup(supabaseAdmin);

    // Check clients with Chat IDs
    const { data: clientsWithChatId } = await supabaseAdmin
      .from("user_telegram_configs")
      .select("user_id")
      .eq("users.role", "CLIENT");

    // Check admin users
    const adminUsers = await getAllAdminUsers(supabaseAdmin);
    let adminsWithChatId = 0;

    for (const admin of adminUsers) {
      const chatId = await getClientChatId(supabaseAdmin, admin.email);
      if (chatId) adminsWithChatId++;
    }

    // Determine if system is ready
    const systemReady = !!botToken &&
                       (adminGroups.length > 0 || adminsWithChatId > 0) &&
                       !!employeeGroup;

    return {
      success: true,
      config: {
        botConfigured: !!botToken,
        adminGroups: adminGroups.length,
        adminGroupNames,
        employeeGroupConfigured: !!employeeGroup,
        employeeGroupName: employeeGroup?.group_name,
        clientsWithChatId: clientsWithChatId?.length || 0,
        totalAdmins: adminUsers.length,
        adminsWithChatId,
        systemReady
      }
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to get status" };
  }
}

// ── Re-exports for Rich Formatting ─────────────────────────────────────

export {
  formatRichTelegramMessage,
  buildOrderAssignedMessage,
  buildOrderCompletedMessage,
  buildCreditsAdjustedMessage,
  buildAccountReadyMessage,
  buildAccountApprovedMessage,
  buildOrderPickedUpMessage,
  buildSimpleNotification,
  buildSystemNotification,
  RichTelegramMessage,
  TelegramButton
} from './telegram-rich-format';