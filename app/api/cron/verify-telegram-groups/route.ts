/**
 * Cron Job: Verify Telegram Group Accessibility
 *
 * Purpose: Automatically check if configured Telegram groups are still accessible
 * Frequency: Every hour
 * Security: Protected by CRON_SECRET environment variable
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Verify cron job secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[CRON] CRON_SECRET not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[CRON] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[CRON] Starting Telegram group verification job");

    const supabase = createAdminClient();

    // Get all active group configurations
    const { data: activeGroups, error: fetchError } = await (supabase as any)
      .from("telegram_group_configs")
      .select("*")
      .eq("is_active", true)
      .order("group_type", { ascending: true });

    if (fetchError) {
      console.error("[CRON] Failed to fetch groups:", fetchError);

      // If table doesn't exist, return gracefully
      if (fetchError.code === "42P01") {
        return NextResponse.json({
          success: true,
          message: "Telegram groups table not created yet",
          groups_checked: 0,
          groups_accessible: 0,
          groups_disabled: 0
        });
      }

      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!activeGroups || activeGroups.length === 0) {
      console.log("[CRON] No active Telegram groups to verify");
      return NextResponse.json({
        success: true,
        message: "No active Telegram groups configured",
        groups_checked: 0,
        groups_accessible: 0,
        groups_disabled: 0
      });
    }

    console.log(`[CRON] Verifying ${activeGroups.length} active Telegram groups`);

    // Get bot token
    const botToken = await getBotToken(supabase);
    if (!botToken) {
      console.error("[CRON] Telegram bot not configured");
      return NextResponse.json({ error: "Telegram bot not configured" }, { status: 500 });
    }

    // Test each group
    const verificationResults = [];
    let accessibleCount = 0;
    let disabledCount = 0;

    for (const group of activeGroups) {
      const result = await testGroupAccessibility(botToken, group);

      verificationResults.push({
        group_id: group.id,
        group_name: group.group_name,
        group_type: group.group_type,
        accessible: result.success,
        error: result.error,
        response_time_ms: result.responseTime
      });

      if (result.success) {
        accessibleCount++;
        console.log(`[CRON] ✅ Group accessible: ${group.group_name} (${result.responseTime}ms)`);
      } else {
        // Auto-disable inaccessible groups
        await disableGroup(supabase, group.id);
        disabledCount++;
        console.log(`[CRON] ❌ Group disabled: ${group.group_name} - ${result.error}`);
      }

      // Small delay between checks to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[CRON] Verification completed: ${accessibleCount}/${activeGroups.length} groups accessible, ${disabledCount} disabled`);

    // Alert admin if more than 50% of groups failed
    if (disabledCount > 0 && disabledCount >= activeGroups.length / 2) {
      await sendAdminAlert(supabase, accessibleCount, activeGroups.length, disabledCount);
    }

    return NextResponse.json({
      success: true,
      groups_checked: activeGroups.length,
      groups_accessible: accessibleCount,
      groups_disabled: disabledCount,
      results: verificationResults,
      message: `Verification complete: ${accessibleCount}/${activeGroups.length} groups accessible`
    });

  } catch (error) {
    console.error("[CRON] Critical error in group verification job:", error);
    return NextResponse.json({
      error: "Cron job failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

/**
 * Get admin bot token from app settings or environment
 */
async function getBotToken(supabase: any): Promise<string | null> {
  try {
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "telegram_bot")
      .maybeSingle();

    const botToken = setting?.value?.bot_token || process.env.TELEGRAM_BOT_TOKEN;
    return botToken || null;
  } catch {
    return process.env.TELEGRAM_BOT_TOKEN || null;
  }
}

/**
 * Test if a group is accessible by sending a simple message
 */
async function testGroupAccessibility(
  botToken: string,
  group: any
): Promise<{ success: boolean; error?: string; responseTime?: number }> {
  const startTime = Date.now();

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: group.group_chat_id,
          text: `🔍 *BoostBuddy Group Check*\n\nThis is an automated accessibility check for the **${group.group_name}** group.\n\nYour group configuration is working correctly!`,
          parse_mode: "Markdown",
          disable_web_page_preview: true
        })
      }
    );

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error?.description || "Unknown Telegram API error",
        responseTime
      };
    }

    return { success: true, responseTime };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
      responseTime
    };
  }
}

/**
 * Disable a group configuration
 */
async function disableGroup(supabase: any, groupId: string): Promise<void> {
  try {
    await supabase
      .from("telegram_group_configs")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", groupId);
  } catch (error) {
    console.error(`[CRON] Failed to disable group ${groupId}:`, error);
  }
}

/**
 * Send admin alert about group verification failures
 */
async function sendAdminAlert(
  supabase: any,
  accessible: number,
  total: number,
  disabled: number
): Promise<void> {
  try {
    // Get bot token
    const botToken = await getBotToken(supabase);
    if (!botToken) return;

    // Get admin groups
    const { data: adminGroups } = await supabase
      .from("telegram_group_configs")
      .select("*")
      .eq("group_type", "ADMIN")
      .eq("is_active", true);

    if (!adminGroups || adminGroups.length === 0) {
      console.warn("[CRON] No admin groups configured for alerts");
      return;
    }

    const alertMessage = `
⚠️ *BoostBuddy Alert: Telegram Groups Issue*

**Group Verification Results:**
- ✅ Accessible: ${accessible}/${total}
- ❌ Disabled: ${disabled}

${disabled > 0 ? `**Action Required:** ${disabled} groups were automatically disabled due to accessibility issues. Please check your Telegram group configurations.` : ''}

**Next Steps:**
1. Verify bot is added to affected groups
2. Check bot permissions in groups
3. Ensure group Chat IDs are correct
4. Re-enable groups in Admin Panel
    `.trim();

    // Send alert to all admin groups
    for (const adminGroup of adminGroups) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: adminGroup.group_chat_id,
            text: alertMessage,
            parse_mode: "Markdown",
            disable_web_page_preview: true
          })
        });
      } catch (error) {
        console.error(`[CRON] Failed to send admin alert to ${adminGroup.group_name}:`, error);
      }

      // Small delay between sends
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log("[CRON] Admin alert sent successfully");

  } catch (error) {
    console.error("[CRON] Failed to send admin alert:", error);
  }
}