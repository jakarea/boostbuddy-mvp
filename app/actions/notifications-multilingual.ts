/**
 * Multilingual Notification System
 * Enhanced notification dispatcher with language support
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getNotificationTemplate,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage
} from "@/lib/locales/notification-templates";

/**
 * Get user's preferred language from database
 */
async function getUserLanguage(userId: string): Promise<SupportedLanguage> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data } = await (supabaseAdmin
      .from("users") as any)
      .select("preferred_language")
      .eq("id", userId)
      .maybeSingle();

    const userLang = data?.preferred_language as string;
    return SUPPORTED_LANGUAGES.includes(userLang as SupportedLanguage)
      ? (userLang as SupportedLanguage)
      : "en"; // Default to English
  } catch (error) {
    console.warn("[MULTILANG] Could not get user language, defaulting to 'en':", error);
    return "en";
  }
}

/**
 * Get user's preferred language by email
 */
async function getUserLanguageByEmail(email: string): Promise<SupportedLanguage> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data } = await (supabaseAdmin
      .from("users") as any)
      .select("id, preferred_language")
      .eq("email", email)
      .maybeSingle();

    if (!data?.id) return "en";

    const userLang = data.preferred_language as string;
    return SUPPORTED_LANGUAGES.includes(userLang as SupportedLanguage)
      ? (userLang as SupportedLanguage)
      : "en";
  } catch (error) {
    console.warn("[MULTILANG] Could not get user language by email, defaulting to 'en':", error);
    return "en";
  }
}

/**
 * Send multilingual notification using templates
 */
export async function sendMultilingualNotificationAction(
  recipientEmail: string,
  notificationType: string,
  templateParams?: Record<string, any>,
  channel: "EMAIL" | "TELEGRAM" = "TELEGRAM",
  priority?: "HIGH" | "MEDIUM" | "LOW",
  relatedOrderId?: string,
  forceLanguage?: SupportedLanguage
) {
  try {
    // Get user's preferred language
    const userLanguage = forceLanguage || await getUserLanguageByEmail(recipientEmail);

    // Get notification template
    const template = getNotificationTemplate(userLanguage, notificationType);
    if (!template) {
      console.error(`[MULTILANG] No template found for notification type: ${notificationType}`);
      return { success: false, error: "Template not found" };
    }

    // Generate subject and body from template
    const subject = template.subject.replace(/{(\w+)}/g, (match, key) => {
      return templateParams?.[key] || match;
    });

    const body = template.body(templateParams);

    // Import and use the existing sendNotificationAction
    const { sendNotificationAction } = await import("./notifications");
    const result = await sendNotificationAction(
      recipientEmail,
      subject,
      body,
      channel,
      notificationType,
      priority,
      relatedOrderId
    );

    return result;
  } catch (error) {
    console.error("[MULTILANG] Failed to send multilingual notification:", error);
    return { success: false, error: "Failed to send notification" };
  }
}

/**
 * Get user's current language preference
 */
export async function getUserLanguagePreferenceAction(userId: string) {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await (supabaseAdmin
      .from("users") as any)
      .select("preferred_language")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    return {
      success: true,
      language: data?.preferred_language || "en"
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to get language preference"
    };
  }
}

/**
 * Update user's language preference
 */
export async function updateUserLanguagePreferenceAction(
  userId: string,
  language: SupportedLanguage
) {
  try {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return {
        success: false,
        error: `Unsupported language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`
      };
    }

    const supabaseAdmin = createAdminClient();
    const { error } = await (supabaseAdmin
      .from("users") as any)
      .update({ preferred_language: language })
      .eq("id", userId);

    if (error) throw error;

    return { success: true, language };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update language preference"
    };
  }
}

/**
 * Get available notification templates for a language
 */
export function getNotificationTemplatesByLanguage(language: SupportedLanguage) {
  const { getNotificationTemplate } = require("@/lib/locales/notification-templates");

  // Return list of available template types for the given language
  const templateTypes = [
    "ACCOUNT_READY",
    "ACCOUNT_APPROVED",
    "ACCOUNT_APPROVED_VERIFIED",
    "NEW_USER_REGISTRATION",
    "REVIEW_ORDER_ASSIGNED",
    "REVIEW_ORDER_IN_PROGRESS",
    "REVIEW_ORDER_CREATED",
    "REVIEW_ORDER_ACCEPTED",
    "REVIEW_ORDER_SKIPPED",
    "REVIEW_COMPLETED_EMPLOYEE",
    "REVIEW_COMPLETED_CLIENT",
    "REVIEW_APPROVED_ADMIN",
    "REVIEW_REJECTED_ADMIN",
    "REVIEW_APPROVED_EMPLOYEE",
    "REVIEW_REJECTED_EMPLOYEE",
    "NEW_ORDER_AVAILABLE",
    "ORDER_CANCELLED_REFUNDED",
    "ASSIGNED_ORDER_CANCELLED",
    "ORDER_CANCELLED",
    "ACCOUNT_RENEWED_UPGRADED",
    "CREDITS_PURCHASED",
    "CREDITS_ADDED",
    "CREDITS_REMOVED",
    "CLIENT_FEEDBACK_HAPPY",
    "CLIENT_FEEDBACK_UNHAPPY",
    "CLIENT_FEEDBACK_ANGRY",
  ];

  return templateTypes.map(type => ({
    type,
    template: getNotificationTemplate(language, type)
  })).filter(item => item.template !== null);
}