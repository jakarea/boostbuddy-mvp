/**
 * Telegram Group Messaging System
 * Team-based notifications instead of individual messages
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/server-auth';

// ── Types ────────────────────────────────────────────────────────────

export interface TelegramGroupConfig {
  id: string;
  group_name: string;
  group_chat_id: string;
  group_type: "ADMIN" | "EMPLOYEE" | "CLIENT_SUPPORT" | "BILLING";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TelegramCredentials {
  bot_token: string;
  chat_id: string;
}

// ── Database Schema (Run this in Supabase SQL Editor) ──────────────────────────────────

/*
-- Create telegram_group_configs table
CREATE TABLE IF NOT EXISTS telegram_group_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_name TEXT NOT NULL,
  group_chat_id TEXT NOT NULL UNIQUE,
  group_type TEXT NOT NULL CHECK (group_type IN ('ADMIN', 'EMPLOYEE', 'CLIENT_SUPPORT', 'BILLING')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient group lookups
CREATE INDEX IF NOT EXISTS idx_group_configs_type_active
ON telegram_group_configs(group_type, is_active);

-- Add RLS policies
ALTER TABLE telegram_group_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage group configs"
  ON telegram_group_configs FOR ALL
  USING (public.is_admin());

CREATE POLICY "Anyone can view active group configs"
  ON telegram_group_configs FOR SELECT
  USING (is_active = true);

-- Add comments for documentation
COMMENT ON TABLE telegram_group_configs IS 'Telegram group configurations for team-based notifications';
COMMENT ON COLUMN telegram_group_configs.group_chat_id IS 'Telegram group Chat ID (negative number for groups)';
COMMENT ON COLUMN telegram_group_configs.group_type IS 'Type of group: ADMIN, EMPLOYEE, CLIENT_SUPPORT, BILLING';
*/

// ── Helper Functions ──────────────────────────────────────────────────

/**
 * Load admin bot token for sending messages
 */
export async function loadAdminBotToken(): Promise<string | null> {
  const supabaseAdmin = createAdminClient();

  try {
    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "telegram_bot")
      .maybeSingle();

    // Type-safe access to app_settings value
    const appSettings = setting?.value ? JSON.parse(setting.value as string) as { bot_token?: string } : null;
    const botToken = appSettings?.bot_token ?? process.env.TELEGRAM_BOT_TOKEN;
    return botToken || null;
  } catch {
    return process.env.TELEGRAM_BOT_TOKEN || null;
  }
}

/**
 * Send message to a specific Telegram group
 */
export async function sendToGroup(
  botToken: string,
  groupChatId: string,
  subject: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: groupChatId,
          text: `*${subject}*\n\n${message}`,
          parse_mode: "Markdown",
          disable_web_page_preview: true
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error?.description || "Unknown Telegram API error"
      };
    }

    console.log(`[TELEGRAM GROUP] Message sent to group: ${groupChatId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[TELEGRAM GROUP] Failed to send: ${error?.message}`);
    return {
      success: false,
      error: error?.message || "Network error"
    };
  }
}

/**
 * Get active group configurations by type
 */
async function getActiveGroupsByType(
  groupType: "ADMIN" | "EMPLOYEE" | "CLIENT_SUPPORT" | "BILLING"
): Promise<TelegramGroupConfig[]> {
  const supabaseAdmin = createAdminClient();

  try {
    const { data, error } = await supabaseAdmin
      .from("telegram_group_configs")
      .select("*")
      .eq("group_type", groupType)
      .eq("is_active", true);

    if (error) {
      if (error.code === "42P01") {
        console.warn(`[TELEGRAM GROUP] Table not created yet, no groups available`);
        return [];
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    console.warn(`[TELEGRAM GROUP] Could not load groups: ${error}`);
    return [];
  }
}

// ── Public Actions ─────────────────────────────────────────────────────

/**
 * Get all Telegram group configurations (admin only)
 */
export async function getTelegramGroupsAction(): Promise<{
  success: boolean;
  groups?: TelegramGroupConfig[];
  error?: string;
}> {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("telegram_group_configs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42P01") return { success: true, groups: [] };
      throw error;
    }

    return { success: true, groups: data || [] };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load groups" };
  }
}

/**
 * Add a new Telegram group configuration (admin only)
 */
export async function addTelegramGroupAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return { success: false, error: "Unauthorized" };

    const groupName = (formData.get("group_name") as string)?.trim();
    const groupChatId = (formData.get("group_chat_id") as string)?.trim();
    const groupType = (formData.get("group_type") as string)?.trim();

    if (!groupName || !groupChatId || !groupType) {
      return { success: false, error: "All fields are required" };
    }

    // Validate group Chat ID format (should be negative for groups)
    if (!groupChatId.startsWith('-')) {
      return {
        success: false,
        error: "Invalid group Chat ID. Group Chat IDs should be negative numbers (e.g., -1001234567890)"
      };
    }

    const validTypes = ["ADMIN", "EMPLOYEE", "CLIENT_SUPPORT", "BILLING"];
    if (!validTypes.includes(groupType)) {
      return { success: false, error: `Invalid group type. Must be one of: ${validTypes.join(", ")}` };
    }

    const supabaseAdmin = createAdminClient();

    // Test that bot can actually send to this group
    const botToken = await loadAdminBotToken();
    if (!botToken) {
      return { success: false, error: "Telegram bot is not configured" };
    }

    const testResult = await sendToGroup(botToken, groupChatId, "Test", "BoostBuddy group configuration test");
    if (!testResult.success) {
      return {
        success: false,
        error: `Cannot send to this group. Make sure the bot is added to the group and has permission to send messages. Error: ${testResult.error}`
      };
    }

    // Save group configuration
    const { error } = await supabaseAdmin
      .from("telegram_group_configs")
      .insert({
        group_name: groupName,
        group_chat_id: groupChatId,
        group_type: groupType,
        is_active: true
      });

    if (error) throw error;

    console.log(`[TELEGRAM GROUP] Added group: ${groupName} (${groupType})`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to add group" };
  }
}

/**
 * Update Telegram group configuration (admin only)
 */
export async function updateTelegramGroupAction(
  groupId: string,
  formData: FormData
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return { success: false, error: "Unauthorized" };

    const groupName = (formData.get("group_name") as string)?.trim();
    const groupChatId = (formData.get("group_chat_id") as string)?.trim();
    const groupType = (formData.get("group_type") as string)?.trim();
    const isActive = formData.get("is_active") === "true";

    if (!groupName || !groupChatId || !groupType) {
      return { success: false, error: "All fields are required" };
    }

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("telegram_group_configs")
      .update({
        group_name: groupName,
        group_chat_id: groupChatId,
        group_type: groupType,
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq("id", groupId);

    if (error) throw error;

    console.log(`[TELEGRAM GROUP] Updated group: ${groupId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update group" };
  }
}

/**
 * Delete Telegram group configuration (admin only)
 */
export async function deleteTelegramGroupAction(groupId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("telegram_group_configs")
      .delete()
      .eq("id", groupId);

    if (error) throw error;

    console.log(`[TELEGRAM GROUP] Deleted group: ${groupId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete group" };
  }
}

/**
 * Send notification to all employees via Telegram group
 * This replaces individual employee messaging with group-based approach
 */
export async function sendToEmployeeGroupAction(
  subject: string,
  message: string,
  priority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM"
): Promise<{
  success: boolean;
  sent: number;
  error?: string;
}> {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return { success: false, error: "Unauthorized", sent: 0 };

    // Load bot token
    const botToken = await loadAdminBotToken();
    if (!botToken) {
      return { success: false, error: "Telegram bot not configured", sent: 0 };
    }

    // Get all active employee groups
    const employeeGroups = await getActiveGroupsByType("EMPLOYEE");

    if (employeeGroups.length === 0) {
      console.warn("[TELEGRAM GROUP] No active employee groups configured");
      return { success: true, sent: 0, error: "No employee groups configured" };
    }

    // Send to all employee groups
    let sentCount = 0;
    const results = await Promise.allSettled(
      employeeGroups.map(group =>
        sendToGroup(botToken, group.group_chat_id, subject, message)
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        sentCount++;
        console.log(`[TELEGRAM GROUP] Sent to employee group: ${employeeGroups[index].group_name}`);
      } else {
        console.error(`[TELEGRAM GROUP] Failed to send to: ${employeeGroups[index].group_name}`);
      }
    });

    // Log the group notification
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from("notification_logs")
      .insert({
        recipient: "EMPLOYEE_GROUP",
        subject,
        body: message,
        type: "EMPLOYEE_GROUP_NOTIFICATION",
        channel: "TELEGRAM",
        status: sentCount > 0 ? "SENT" : "FAILED",
        priority,
        user_id: auth.user.id
      });

    return { success: sentCount > 0, sent: sentCount };
  } catch (error: any) {
    console.error(`[TELEGRAM GROUP] Employee group broadcast failed: ${error}`);
    return { success: false, sent: 0, error: error?.message || "Failed to send to employee group" };
  }
}

/**
 * Send notification to admin group
 */
export async function sendToAdminGroupAction(
  subject: string,
  message: string,
  priority: "HIGH" | "MEDIUM" | "LOW" = "HIGH"
): Promise<{
  success: boolean;
  sent: number;
  error?: string;
}> {
  try {
    const botToken = await loadAdminBotToken();
    if (!botToken) {
      return { success: false, error: "Telegram bot not configured", sent: 0 };
    }

    const adminGroups = await getActiveGroupsByType("ADMIN");
    if (adminGroups.length === 0) {
      return { success: true, sent: 0, error: "No admin groups configured" };
    }

    let sentCount = 0;
    const results = await Promise.allSettled(
      adminGroups.map(group =>
        sendToGroup(botToken, group.group_chat_id, subject, message)
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        sentCount++;
        console.log(`[TELEGRAM GROUP] Sent to admin group: ${adminGroups[index].group_name}`);
      }
    });

    return { success: sentCount > 0, sent: sentCount };
  } catch (error: any) {
    return { success: false, sent: 0, error: error?.message || "Failed to send to admin group" };
  }
}

/**
 * Test group configuration
 */
export async function testTelegramGroupAction(groupId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    const { data: group } = await supabaseAdmin
      .from("telegram_group_configs")
      .select("*")
      .eq("id", groupId)
      .maybeSingle();

    if (!group) {
      return { success: false, error: "Group not found" };
    }

    const botToken = await loadAdminBotToken();
    if (!botToken) {
      return { success: false, error: "Telegram bot not configured" };
    }

    const result = await sendToGroup(
      botToken,
      group.group_chat_id,
      "Test Message",
      `✅ *BoostBuddy Group Test*\n\nThis is a test message for the **${group.group_name}** group.\n\nYour Telegram group configuration is working correctly!`
    );

    if (!result.success) {
      return { success: false, error: result.error || "Failed to send test message" };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Test failed" };
  }
}

/**
 * Verify all group configurations (check if bot can still send to them)
 */
export async function verifyAllGroupsAction(): Promise<{
  success: boolean;
  results?: Array<{
    groupId: string;
    groupName: string;
    groupType: string;
    accessible: boolean;
    error?: string;
  }>;
  error?: string;
}> {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    const { data: groups } = await supabaseAdmin
      .from("telegram_group_configs")
      .select("*")
      .eq("is_active", true);

    if (!groups || groups.length === 0) {
      return { success: true, results: [] };
    }

    const botToken = await loadAdminBotToken();
    if (!botToken) {
      return { success: false, error: "Telegram bot not configured" };
    }

    const results = [];
    const supabase = createAdminClient();

    for (const group of groups) {
      const testResult = await sendToGroup(
        botToken,
        group.group_chat_id,
        "Verification",
        "BoostBuddy group accessibility check"
      );

      const groupResult = {
        groupId: group.id,
        groupName: group.group_name,
        groupType: group.group_type,
        accessible: testResult.success,
        error: testResult.error
      };

      results.push(groupResult);

      // Auto-disable groups that failed
      if (!testResult.success) {
        await supabase
          .from("telegram_group_configs")
          .update({ is_active: false })
          .eq("id", group.id);

        console.warn(`[TELEGRAM GROUP] Disabled inaccessible group: ${group.group_name}`);
      }
    }

    return { success: true, results };
  } catch (error: any) {
    return { success: false, error: error?.message || "Verification failed" };
  }
}

// ── Employee Broadcast Replacement ──────────────────────────────────────

/**
 * This function replaces the old broadcastToEmployeesAction
 * Now sends a single message to employee group instead of individual messages
 */
export async function broadcastToEmployeeGroupAction(
  subject: string,
  message: string,
  notificationType: string,
  priority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM",
  relatedOrderId?: string
): Promise<{ success: boolean; sent: number; error?: string }> {
  try {
    const auth = await requireAuth({ role: 'ADMIN' });
    if (!auth.success) return { success: false, error: "Unauthorized", sent: 0 };

    // Get employee groups
    const employeeGroups = await getActiveGroupsByType("EMPLOYEE");
    if (employeeGroups.length === 0) {
      console.warn("[EMPLOYEE BROADCAST] No employee groups configured, falling back to individual messaging");

      // Fallback to old individual messaging if no groups configured
      const { broadcastToEmployeesAction } = await import("./notifications");
      return await broadcastToEmployeesAction(subject, message, notificationType, priority, relatedOrderId);
    }

    // Send to employee groups instead of individual messages
    const result = await sendToEmployeeGroupAction(subject, message, priority);

    // Log the notification
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from("notification_logs")
      .insert({
        recipient: "ALL_EMPLOYEES",
        subject,
        body: message,
        type: notificationType,
        channel: "TELEGRAM",
        status: result.success ? "SENT" : "FAILED",
        priority,
        related_order_id: relatedOrderId
      });

    return result;
  } catch (error: any) {
    return { success: false, sent: 0, error: error?.message || "Employee broadcast failed" };
  }
}