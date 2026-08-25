/**
 * Rich Telegram Message Formatting
 *
 * Provides enhanced Telegram messages with:
 * - Rich formatting (HTML mode for better reliability)
 * - Inline buttons for quick actions
 * - Emojis and visual structure
 * - Consistent branding
 */

// ── Types ────────────────────────────────────────────────────────────

export interface TelegramButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface RichTelegramMessage {
  subject: string;
  body: string;
  buttons?: TelegramButton[][];
  emoji?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  metadata?: {
    orderId?: string;
    employeeId?: string;
    clientId?: string;
    type?: string;
  };
}

// ── Formatting Constants ──────────────────────────────────────────────

const EMOJIS = {
  // Order notifications
  ORDER_ASSIGNED: "🎯",
  ORDER_IN_PROGRESS: "⚙️",
  ORDER_COMPLETED: "✅",
  ORDER_CANCELLED: "❌",
  ORDER_PENDING: "⏳",

  // Account notifications
  ACCOUNT_READY: "👋",
  ACCOUNT_APPROVED: "🎉",
  ACCOUNT_DEACTIVATED: "🔒",

  // Credit notifications
  CREDITS_ADDED: "➕",
  CREDITS_REMOVED: "➖",
  CREDITS_PURCHASED: "💳",

  // Review notifications
  REVIEW_SUBMITTED: "📝",
  REVIEW_APPROVED: "⭐",
  REVIEW_REJECTED: "🚫",

  // System notifications
  SYSTEM: "ℹ️",
  WARNING: "⚠️",
  ERROR: "🚨",
  SUCCESS: "✨",

  // Employee notifications
  EMPLOYEE: "👤",
  TEAM: "👥",

  // General
  BELL: "🔔",
  BOOST_BUDDY: "🚀",
};

// ── Rich Message Builders ────────────────────────────────────────────────

/**
 * Format a rich Telegram message with HTML and buttons
 */
export function formatRichTelegramMessage(
  message: RichTelegramMessage
): { text: string; reply_markup?: any } {
  const emoji = message.emoji || "🔔";
  const priorityEmoji = message.priority === "HIGH" ? "🔴" : message.priority === "MEDIUM" ? "🟡" : "⚪";

  // Build the formatted message
  let text = "";

  // Header with emoji and priority
  text += `${emoji} ${priorityEmoji} <b>${escapeHtml(message.subject)}</b>\n\n`;

  // Body with proper formatting
  text += formatMessageBody(message.body);

  // Add metadata footer if present
  if (message.metadata?.orderId) {
    text += `\n\n📌 <i>Order: ${message.metadata.orderId.slice(0, 8)}...</i>`;
  }

  // Build reply markup for buttons
  let reply_markup;
  if (message.buttons && message.buttons.length > 0) {
    reply_markup = {
      inline_keyboard: message.buttons.map(row =>
        row.map(button => {
          const btn: any = { text: button.text };
          if (button.url) btn.url = button.url;
          if (button.callback_data !== undefined) btn.callback_data = button.callback_data;
          return btn;
        })
      )
    };
  }

  return { text, reply_markup };
}

/**
 * Format message body with HTML support
 */
function formatMessageBody(body: string): string {
  // Preserve line breaks
  return body
    .split("\n")
    .map(line => {
      // Don't escape already HTML-formatted content
      if (line.includes("<b>") || line.includes("<i>") || line.includes("<code>") || line.includes("<a href=")) {
        return line;
      }
      // Escape HTML special characters but preserve formatting
      return escapeHtml(line);
    })
    .join("\n");
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return text.replace(/[&<>"']/g, char => htmlEntities[char]);
}

// ── Pre-built Message Templates ──────────────────────────────────────

/**
 * Order assigned notification
 */
export function buildOrderAssignedMessage(
  orderId: string,
  businessName: string,
  orderType: string,
  baseUrl: string
): RichTelegramMessage {
  return {
    emoji: EMOJIS.ORDER_ASSIGNED,
    subject: "New Review Order Assigned",
    body: `You have been assigned a new review order.

<b>Business:</b> ${businessName}
<b>Type:</b> ${orderType}
<b>Order ID:</b> ${orderId.slice(0, 8)}...

Please complete this order as soon as possible.`,
    buttons: [
      [
        { text: "📋 View Order", url: `${baseUrl}/e/notifications` },
        { text: "✅ Mark Complete", url: `${baseUrl}/e/notifications` }
      ]
    ],
    priority: "HIGH",
    metadata: { orderId, type: "ORDER_ASSIGNED" }
  };
}

/**
 * Order completed notification
 */
export function buildOrderCompletedMessage(
  orderId: string,
  businessName: string,
  completedBy: string
): RichTelegramMessage {
  return {
    emoji: EMOJIS.ORDER_COMPLETED,
    subject: "Review Order Completed",
    body: `A review order has been marked as complete.

<b>Business:</b> ${businessName}
<b>Order ID:</b> ${orderId.slice(0, 8)}...
<b>Completed by:</b> ${completedBy}

The order is now awaiting your review.`,
    buttons: [
      [
        { text: "👁️ Review Order", url: `#` } // Will be replaced with actual URL
      ],
      [
        { text: "✓ Approve", callback_data: `approve_${orderId}` },
        { text: "✗ Reject", callback_data: `reject_${orderId}` }
      ]
    ],
    priority: "HIGH",
    metadata: { orderId, type: "ORDER_COMPLETED" }
  };
}

/**
 * Credits adjusted notification
 */
export function buildCreditsAdjustedMessage(
  amount: number,
  newBalance: number,
  reason: string
): RichTelegramMessage {
  const isPositive = amount > 0;
  const emoji = isPositive ? EMOJIS.CREDITS_ADDED : EMOJIS.CREDITS_REMOVED;
  const sign = isPositive ? "+" : "";

  return {
    emoji: emoji,
    subject: `Credits ${isPositive ? "Added" : "Deducted"}`,
    body: `Your credit balance has been updated.

<b>Amount:</b> ${sign}${amount} credits
<b>New Balance:</b> ${newBalance} credits
<b>Reason:</b> ${reason}`,
    buttons: [
      [
        { text: "💳 Purchase Credits", url: `#` } // Will be replaced with actual URL
      ],
      [
        { text: "📊 View History", url: `#` }
      ]
    ],
    priority: "MEDIUM",
    metadata: { type: "CREDITS_ADJUSTED" }
  };
}

/**
 * Account ready notification
 */
export function buildAccountReadyMessage(
  userEmail: string,
  tempPassword?: string
): RichTelegramMessage {
  const body = tempPassword
    ? `Your BoostBuddy account has been created and is ready to use!

<b>Email:</b> ${userEmail}
<b>Temporary Password:</b> <code>${tempPassword}</code>

Please log in and change your password immediately.`
    : `Your BoostBuddy account has been created and is ready to use!

<b>Email:</b> ${userEmail}

You can now log in to your account.`;

  return {
    emoji: EMOJIS.ACCOUNT_READY,
    subject: "Account Ready - Welcome to BoostBuddy!",
    body: body,
    buttons: [
      [
        { text: "🚀 Log In Now", url: `#` } // Will be replaced with actual URL
      ]
    ],
    priority: "HIGH",
    metadata: { type: "ACCOUNT_READY" }
  };
}

/**
 * Account approved notification
 */
export function buildAccountApprovedMessage(): RichTelegramMessage {
  return {
    emoji: EMOJIS.ACCOUNT_APPROVED,
    subject: "Account Approved!",
    body: `Your BoostBuddy account registration has been approved by the administrator.

You now have full access to the platform and can:
• Place review orders
• Manage your profiles
• Track your credits

Welcome aboard! 🎉`,
    buttons: [
      [
        { text: "📝 Place Order", url: `#` },
        { text: "👤 My Profile", url: `#` }
      ]
    ],
    priority: "HIGH",
    metadata: { type: "ACCOUNT_APPROVED" }
  };
}

/**
 * Employee order picked up notification
 */
export function buildOrderPickedUpMessage(
  orderId: string,
  employeeName: string,
  businessName: string
): RichTelegramMessage {
  return {
    emoji: EMOJIS.ORDER_IN_PROGRESS,
    subject: "Order Picked Up",
    body: `An order has been picked up by an employee.

<b>Employee:</b> ${employeeName}
<b>Business:</b> ${businessName}
<b>Order ID:</b> ${orderId.slice(0, 8)}...

The order is now in progress.`,
    buttons: [
      [
        { text: "📊 Track Progress", url: `#` }
      ]
    ],
    priority: "MEDIUM",
    metadata: { orderId, type: "ORDER_PICKED_UP" }
  };
}

/**
 * Simple notification with emoji
 */
export function buildSimpleNotification(
  subject: string,
  message: string,
  emoji?: string,
  priority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM"
): RichTelegramMessage {
  return {
    emoji: emoji || EMOJIS.BELL,
    subject: subject,
    body: message,
    buttons: [],
    priority: priority
  };
}

/**
 * System notification
 */
export function buildSystemNotification(
  subject: string,
  message: string
): RichTelegramMessage {
  return {
    emoji: EMOJIS.SYSTEM,
    subject: subject,
    body: message,
    priority: "LOW",
    buttons: []
  };
}

// ── Send Function with Rich Formatting ────────────────────────────────

/**
 * Send rich Telegram message with formatting and buttons
 */
export async function sendRichTelegramMessage(
  botToken: string,
  chatId: string,
  message: RichTelegramMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const { text, reply_markup } = formatRichTelegramMessage(message);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "HTML",
          disable_web_page_preview: false, // Enable for URLs in messages
          reply_markup: reply_markup
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
