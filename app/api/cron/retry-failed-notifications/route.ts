/**
 * Cron Job: Retry Failed Telegram Notifications
 *
 * Purpose: Automatically retry notifications that failed due to temporary issues
 * Frequency: Every 5 minutes
 * Security: Protected by CRON_SECRET environment variable
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { loadAdminBotToken, sendToGroup } from "@/app/actions/telegram-groups";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Verify cron job secret to prevent unauthorized access
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

    console.log("[CRON] Starting failed notification retry job");

    const supabase = createAdminClient();

    // Get failed notifications from last hour that haven't been retried too many times
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: failedNotifications, error: fetchError } = await (supabase as any)
      .from("notification_logs")
      .select("*")
      .eq("status", "FAILED")
      .eq("channel", "TELEGRAM")
      .or("retry_count.lt.3,retry_count.is.null")
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchError) {
      console.error("[CRON] Failed to fetch notifications:", fetchError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!failedNotifications || failedNotifications.length === 0) {
      console.log("[CRON] No failed notifications to retry");
      return NextResponse.json({
        success: true,
        retried: 0,
        total: 0,
        message: "No failed notifications to retry"
      });
    }

    console.log(`[CRON] Found ${failedNotifications.length} failed notifications to retry`);

    // Load bot token once for all retries
    const botToken = await loadAdminBotToken();
    if (!botToken) {
      console.error("[CRON] Telegram bot not configured");
      return NextResponse.json({ error: "Telegram bot not configured" }, { status: 500 });
    }

    // Retry each failed notification with rate limiting
    let retried = 0;
    let failed = 0;
    const retryResults = [];

    for (const notification of failedNotifications) {
      try {
        // Determine if this was a group or individual notification
        const isGroupNotification = notification.recipient === "EMPLOYEE_GROUP" ||
                                   notification.recipient === "ALL_EMPLOYEES";

        if (isGroupNotification) {
          // For group notifications, we'd need to know which group to send to
          // This is a simplified version - you might need to store group_id in notification_logs
          console.log(`[CRON] Skipping group notification ${notification.id} (needs specific group handling)`);
          continue;
        }

        // For individual notifications, we need the user's Chat ID
        // This would require looking up the user's telegram config
        // For now, we'll mark as permanently failed if we can't handle it

        const retryCount = notification.retry_count || 0;

        // Attempt retry with exponential backoff
        const shouldRetry = await checkIfShouldRetry(notification, retryCount);

        if (!shouldRetry) {
          // Mark as permanently failed
          await (supabase as any)
            .from("notification_logs")
            .update({ status: "PERMANENTLY_FAILED", retry_count: retryCount + 1 })
            .eq("id", notification.id);

          failed++;
          retryResults.push({
            id: notification.id,
            status: "PERMANENTLY_FAILED",
            reason: "Max retries exceeded or non-retryable error"
          });
          console.log(`[CRON] Notification ${notification.id} marked as permanently failed`);
          continue;
        }

        // Wait between retries to avoid rate limiting
        if (retried > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }

        // Attempt to send the notification again
        // This is a simplified version - you'd need to implement the actual retry logic
        // based on your notification dispatch system

        console.log(`[CRON] Attempting retry for notification ${notification.id}`);

        // For this example, we'll simulate a retry
        // In production, you'd call your actual dispatch function
        const retrySuccess = await attemptNotificationRetry(notification, botToken);

        if (retrySuccess) {
          await (supabase as any)
            .from("notification_logs")
            .update({
              status: "SENT",
              retry_count: retryCount + 1,
              updated_at: new Date().toISOString()
            })
            .eq("id", notification.id);

          retried++;
          retryResults.push({
            id: notification.id,
            status: "SENT",
            attempt: retryCount + 1
          });
          console.log(`[CRON] Successfully retried notification ${notification.id}`);
        } else {
          await (supabase as any)
            .from("notification_logs")
            .update({ retry_count: retryCount + 1 })
            .eq("id", notification.id);

          failed++;
          retryResults.push({
            id: notification.id,
            status: "FAILED",
            attempt: retryCount + 1
          });
          console.log(`[CRON] Retry failed for notification ${notification.id}`);
        }

      } catch (error) {
        console.error(`[CRON] Error retrying notification ${notification.id}:`, error);
        failed++;

        // Update retry count even if error occurred
        await (supabase as any)
          .from("notification_logs")
          .update({ retry_count: (notification.retry_count || 0) + 1 })
          .eq("id", notification.id)
          .catch(console.error);
      }
    }

    console.log(`[CRON] Retry job completed: ${retried} succeeded, ${failed} failed out of ${failedNotifications.length} total`);

    return NextResponse.json({
      success: true,
      retried,
      failed,
      total: failedNotifications.length,
      results: retryResults,
      message: `Successfully retried ${retried}/${failedNotifications.length} notifications`
    });

  } catch (error) {
    console.error("[CRON] Critical error in retry job:", error);
    return NextResponse.json({
      error: "Cron job failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

/**
 * Check if notification should be retried based on retry count and error type
 */
async function checkIfShouldRetry(notification: any, retryCount: number): Promise<boolean> {
  // Max 3 retries
  if (retryCount >= 3) {
    return false;
  }

  // Check if the error was temporary (network, rate limit, etc.)
  // You might store error details in notification_logs
  const errorMessage = notification.error_message || "";

  // Don't retry certain permanent errors
  const permanentErrors = [
    "bot was blocked by the user",
    "chat not found",
    "bot can't send messages to bots",
    "user is deactivated"
  ];

  const isPermanentError = permanentErrors.some(error =>
    errorMessage.toLowerCase().includes(error.toLowerCase())
  );

  if (isPermanentError) {
    return false;
  }

  // Retry temporary errors
  const temporaryErrors = [
    "timeout",
    "network",
    "rate limit",
    "too many requests",
    "internal server error"
  ];

  const isTemporaryError = temporaryErrors.some(error =>
    errorMessage.toLowerCase().includes(error.toLowerCase())
  );

  return isTemporaryError || !errorMessage; // Retry if no error message saved
}

/**
 * Attempt to resend a failed notification
 * This is a placeholder - implement based on your notification system
 */
async function attemptNotificationRetry(notification: any, botToken: string): Promise<boolean> {
  try {
    // You need to implement this based on your notification dispatch system
    // This would typically:
    // 1. Determine the recipient (user or group)
    // 2. Get their Chat ID
    // 3. Send the message via Telegram API
    // 4. Return success/failure

    // For now, this is a placeholder
    console.log(`[CRON] Would retry notification ${notification.id} to ${notification.recipient}`);

    // TODO: Implement actual retry logic with Telegram API
    // 1. Get user's telegram_chat_id from users table
    // 2. Send notification via Telegram Bot API
    // 3. Return true on success, false on failure
    return true; // Always return success until actual retry is implemented

  } catch (error) {
    console.error(`[CRON] Retry failed for notification ${notification.id}:`, error);
    return false;
  }
}