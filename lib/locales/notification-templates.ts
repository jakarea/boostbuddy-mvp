/**
 * Multilingual Notification Message Templates
 * Supports English (en) and Italian (it) for all notification types
 */

export interface NotificationTemplate {
  subject: string;
  body: (params?: any) => string;
}

export interface NotificationTemplates {
  [key: string]: NotificationTemplate;
}

// English notification templates
export const enTemplates: NotificationTemplates = {
  // Account Management
  ACCOUNT_READY: {
    subject: "🎉 Your BoostBuddy Account is Ready!",
    body: (params) => `Hello ${params.name},\n\nYour ${params.role.toLowerCase()} account has been created and is ready to use!\n\nYou can log in immediately at: https://boostbuddy.it${params.dashboardUrl}\n\nYour credentials:\n📧 Email: ${params.email}\n🔑 Password: [The password you set]\n\nWelcome to BoostBuddy!`
  },

  ACCOUNT_APPROVED: {
    subject: "🎉 Account Approved!",
    body: (params) => `Hello ${params.name || "Client"},\n\nYour BoostBuddy account registration has been approved by the administrator!\n\nYou can now log into your account at https://boostbuddy.it`
  },

  ACCOUNT_APPROVED_VERIFIED: {
    subject: "🎉 Account Approved & Email Verified!",
    body: (params) => `Hello ${params.name || "Client"},\n\nYour BoostBuddy account registration has been approved by the administrator and your email is verified!\n\nYou can now log into your account at https://boostbuddy.it`
  },

  NEW_USER_REGISTRATION: {
    subject: "🆕 New User Registration Pending Approval",
    body: (params) => `A new client has registered on BoostBuddy:\n\n👤 *Name:* ${params.name}\n📧 *Email:* ${params.email}\n\nPlease review and approve this client in the Admin Dashboard.`
  },

  // Review Order Management
  REVIEW_ORDER_ASSIGNED: {
    subject: "📝 New Review Order Assigned",
    body: (params) => `You have been assigned a new ${params.orderType} order (${params.quantity} units).`
  },

  REVIEW_ORDER_IN_PROGRESS: {
    subject: "🔄 Your Review Order Is In Progress",
    body: (params) => `Your ${params.orderType} order (${params.quantity} units) is now being processed by an employee.`
  },

  REVIEW_ORDER_CREATED: {
    subject: `📝 New {orderType} Order Created`,
    body: (params) => `Your ${params.orderType.toLowerCase()} order for ${params.quantity} unit(s) has been created. ${params.requiredCredits} credits have been deducted.`
  },

  REVIEW_ORDER_ACCEPTED: {
    subject: "✅ Review Order Accepted",
    body: (params) => `You have accepted the ${params.orderType} order (${params.orderId}) and it is now in progress.`
  },

  REVIEW_ORDER_SKIPPED: {
    subject: "📝 Review Order Skipped",
    body: (params) => `You have skipped the ${params.orderType} order (${params.orderId}).${params.reason ? ' Reason: ' + params.reason : ''}`
  },

  REVIEW_COMPLETED_EMPLOYEE: {
    subject: "🎉 Review Completed Successfully",
    body: (params) => `Excellent! You have successfully completed the ${params.orderType} order (${params.orderId}).`
  },

  REVIEW_COMPLETED_CLIENT: {
    subject: "✅ Review Completed",
    body: (params) => `Your ${params.orderType} order (${params.orderId}) has been completed by the employee.`
  },

  REVIEW_APPROVED_ADMIN: {
    subject: "✅ Review Approved by Admin",
    body: (params) => `Your review has been approved by the administrator.`
  },

  REVIEW_REJECTED_ADMIN: {
    subject: "❌ Review Rejected by Admin",
    body: (params) => `Your review has been rejected by the administrator. Reason: ${params.reason}`
  },

  REVIEW_APPROVED_EMPLOYEE: {
    subject: "✅ Your Review Was Approved",
    body: (params) => `Great job! Your review has been approved by the administrator.`
  },

  REVIEW_REJECTED_EMPLOYEE: {
    subject: "❌ Your Review Was Rejected",
    body: (params) => `Your review has been rejected. Reason: ${params.reason}`
  },

  NEW_ORDER_AVAILABLE: {
    subject: "🔔 New {orderType} Order Available",
    body: (params) => `A new ${params.orderType} order for ${params.quantity} unit(s) is ready to process.`
  },

  // Order Management
  ORDER_CANCELLED_REFUNDED: {
    subject: "💰 Order Cancelled - Credits Refunded",
    body: (params) => `Your order has been cancelled and ${params.refundAmount} credits refunded.`
  },

  ASSIGNED_ORDER_CANCELLED: {
    subject: "❌ Assigned Order Cancelled",
    body: (params) => `Your assigned order has been cancelled by the client or administrator.`
  },

  ORDER_CANCELLED: {
    subject: "❌ Order Cancelled",
    body: (params) => `Your order has been cancelled.`
  },

  ACCOUNT_RENEWED_UPGRADED: {
    subject: "Account Renewed/Upgraded",
    body: (params) => `Profile account ${params.profileId} has been successfully renewed/upgraded.`
  },

  // Credits Management
  CREDITS_PURCHASED: {
    subject: "💰 Credits Purchased Successfully",
    body: (params) => `Your credit purchase of ${params.amount} credits is complete.`
  },

  CREDITS_ADDED: {
    subject: "🔄 Credits Added to Your Account",
    body: (params) => `${params.amount} credits have been added to your account.${params.reason ? ' Reason: ' + params.reason : ''}`
  },

  CREDITS_REMOVED: {
    subject: "🔄 Credits Removed from Your Account",
    body: (params) => `${Math.abs(params.amount)} credits have been removed from your account.${params.reason ? ' Reason: ' + params.reason : ''}`
  },

  // Client Feedback
  CLIENT_FEEDBACK_HAPPY: {
    subject: "😊 Client Feedback Received",
    body: (params) => `Client has submitted feedback "HAPPY" on order ${params.orderId}.`
  },

  CLIENT_FEEDBACK_UNHAPPY: {
    subject: "😕 Client Feedback Received",
    body: (params) => `Client has submitted feedback "UNHAPPY" on order ${params.orderId}.`
  },

  CLIENT_FEEDBACK_ANGRY: {
    subject: "😡 Client Feedback Received",
    body: (params) => `Client has submitted feedback "ANGRY" on order ${params.orderId}.`
  },
};

// Italian notification templates
export const itTemplates: NotificationTemplates = {
  // Account Management
  ACCOUNT_READY: {
    subject: "🎉 Il tuo account BoostBuddy è pronto!",
    body: (params) => `Ciao ${params.name},\n\nIl tuo account ${params.role.toLowerCase()} è stato creato ed è pronto per l'uso!\n\nPuoi accedere immediatamente all'indirizzo: https://boostbuddy.it${params.dashboardUrl}\n\nLe tue credenziali:\n📧 Email: ${params.email}\n🔑 Password: [La password impostata]\n\nBenvenuto su BoostBuddy!`
  },

  ACCOUNT_APPROVED: {
    subject: "🎉 Account Approvato!",
    body: (params) => `Ciao ${params.name || "Cliente"},\n\nLa tua registrazione su BoostBuddy è stata approvata dall'amministratore!\n\nOra puoi accedere al tuo account all'indirizzo https://boostbuddy.it`
  },

  ACCOUNT_APPROVED_VERIFIED: {
    subject: "🎉 Account Approvato e Email Verificata!",
    body: (params) => `Ciao ${params.name || "Cliente"},\n\nLa tua registrazione su BoostBuddy è stata approvata dall'amministratore e la tua email è stata verificata!\n\nOra puoi accedere al tuo account all'indirizzo https://boostbuddy.it`
  },

  NEW_USER_REGISTRATION: {
    subject: "🆕 Nuova Registrazione Utente in Attesa di Approvazione",
    body: (params) => `Un nuovo cliente si è registrato su BoostBuddy:\n\n👤 *Nome:* ${params.name}\n📧 *Email:* ${params.email}\n\nSi prega di revisionare e approvare questo cliente nel Pannello di Amministrazione.`
  },

  // Review Order Management
  REVIEW_ORDER_ASSIGNED: {
    subject: "📝 Nuovo Ordine di Revisione Assegnato",
    body: (params) => `Ti è stato assegnato un nuovo ordine ${params.orderType} (${params.quantity} unità).`
  },

  REVIEW_ORDER_IN_PROGRESS: {
    subject: "🔄 Il tuo ordine di revisione è in corso",
    body: (params) => `Il tuo ordine ${params.orderType} (${params.quantity} unità) è ora in fase di elaborazione da un dipendente.`
  },

  REVIEW_ORDER_CREATED: {
    subject: `📝 Nuovo ordine {orderType} creato`,
    body: (params) => `Il tuo ordine ${params.orderType.toLowerCase()} per ${params.quantity} unità(i) è stato creato. ${params.requiredCredits} crediti sono stati dedotti.`
  },

  REVIEW_ORDER_ACCEPTED: {
    subject: "✅ Ordine di revisione accettato",
    body: (params) => `Hai accettato l'ordine ${params.orderType} (${params.orderId}) ed è ora in corso.`
  },

  REVIEW_ORDER_SKIPPED: {
    subject: "📝 Ordine di revisione saltato",
    body: (params) => `Hai saltato l'ordine ${params.orderType} (${params.orderId}).${params.reason ? ' Motivo: ' + params.reason : ''}`
  },

  REVIEW_COMPLETED_EMPLOYEE: {
    subject: "🎉 Revisione completata con successo",
    body: (params) => `Eccellente! Hai completato con successo l'ordine ${params.orderType} (${params.orderId}).`
  },

  REVIEW_COMPLETED_CLIENT: {
    subject: "✅ Revisione completata",
    body: (params) => `Il tuo ordine ${params.orderType} (${params.orderId}) è stato completato dal dipendente.`
  },

  REVIEW_APPROVED_ADMIN: {
    subject: "✅ Revisione approvata dall'amministratore",
    body: (params) => `La tua revisione è stata approvata dall'amministratore.`
  },

  REVIEW_REJECTED_ADMIN: {
    subject: "❌ Revisione rifiutata dall'amministratore",
    body: (params) => `La tua revisione è stata rifiutata dall'amministratore. Motivo: ${params.reason}`
  },

  REVIEW_APPROVED_EMPLOYEE: {
    subject: "✅ La tua revisione è stata approvata",
    body: (params) => `Ottimo lavoro! La tua revisione è stata approvata dall'amministratore.`
  },

  REVIEW_REJECTED_EMPLOYEE: {
    subject: "❌ La tua revisione è stata rifiutata",
    body: (params) => `La tua revisione è stata rifiutata. Motivo: ${params.reason}`
  },

  NEW_ORDER_AVAILABLE: {
    subject: "🔔 Nuovo ordine {orderType} disponibile",
    body: (params) => `Un nuovo ordine ${params.orderType} per ${params.quantity} unità(i) è pronto per essere elaborato.`
  },

  // Order Management
  ORDER_CANCELLED_REFUNDED: {
    subject: "💰 Ordine cancellato - Crediti rimborsati",
    body: (params) => `Il tuo ordine è stato cancellato e ${params.refundAmount} crediti sono stati rimborsati.`
  },

  ASSIGNED_ORDER_CANCELLED: {
    subject: "❌ Ordine assegnato cancellato",
    body: (params) => `Il tuo ordine assegnato è stato cancellato dal cliente o dall'amministratore.`
  },

  ORDER_CANCELLED: {
    subject: "❌ Ordine cancellato",
    body: (params) => `Il tuo ordine è stato cancellato.`
  },

  ACCOUNT_RENEWED_UPGRADED: {
    subject: "Account rinnovato/aggiornato",
    body: (params) => `L'account profilo ${params.profileId} è stato rinnovato/aggiornato con successo.`
  },

  // Credits Management
  CREDITS_PURCHASED: {
    subject: "💰 Crediti acquistati con successo",
    body: (params) => `Il tuo acquisto di ${params.amount} crediti è stato completato.`
  },

  CREDITS_ADDED: {
    subject: "🔄 Crediti aggiunti al tuo account",
    body: (params) => `${params.amount} crediti sono stati aggiunti al tuo account.${params.reason ? ' Motivo: ' + params.reason : ''}`
  },

  CREDITS_REMOVED: {
    subject: "🔄 Crediti rimossi dal tuo account",
    body: (params) => `${Math.abs(params.amount)} crediti sono stati rimossi dal tuo account.${params.reason ? ' Motivo: ' + params.reason : ''}`
  },

  // Client Feedback
  CLIENT_FEEDBACK_HAPPY: {
    subject: "😊 Feedback cliente ricevuto",
    body: (params) => `Il cliente ha inviato feedback "FELICE" sull'ordine ${params.orderId}.`
  },

  CLIENT_FEEDBACK_UNHAPPY: {
    subject: "😕 Feedback cliente ricevuto",
    body: (params) => `Il cliente ha inviato feedback "INFELICE" sull'ordine ${params.orderId}.`
  },

  CLIENT_FEEDBACK_ANGRY: {
    subject: "😡 Feedback cliente ricevuto",
    body: (params) => `Il cliente ha inviato feedback "ARRABBIATO" sull'ordine ${params.orderId}.`
  },
};

/**
 * Get notification template by language and type
 */
export function getNotificationTemplate(
  language: string,
  type: string
): NotificationTemplate | null {
  const templates = language === 'it' ? itTemplates : enTemplates;
  return templates[type] || null;
}

/**
 * Get supported languages
 */
export const SUPPORTED_LANGUAGES = ['en', 'it'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];