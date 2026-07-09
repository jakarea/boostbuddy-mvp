/**
 * Date utility functions for profile expiration tracking
 */

/**
 * Calculate days remaining until expiration
 * @param expirationDateStr - ISO date string
 * @param currentDate - Reference date (default: today)
 * @returns Days remaining, or null if no expiration date
 */
export function getDaysRemaining(expirationDateStr?: string, currentDate?: Date): number | null {
  if (!expirationDateStr) return null;

  const today = currentDate || new Date();
  const expDate = new Date(expirationDateStr);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if a profile is expiring soon
 * @param expirationDateStr - ISO date string
 * @param status - Profile status
 * @param daysThreshold - How many days before expiration to consider "soon" (default: 7)
 * @param currentDate - Reference date
 * @returns true if expiring within threshold
 */
export function isExpiringSoon(
  expirationDateStr?: string,
  status?: string,
  daysThreshold = 7,
  currentDate?: Date
): boolean {
  if (status !== "ACTIVE") return false;

  const days = getDaysRemaining(expirationDateStr, currentDate);
  return days !== null && days >= 0 && days <= daysThreshold;
}

/**
 * Check if a profile has expired
 * @param expirationDateStr - ISO date string
 * @param status - Profile status
 * @param currentDate - Reference date
 * @returns true if expired
 */
export function isExpired(expirationDateStr?: string, status?: string, currentDate?: Date): boolean {
  if (status === "EXPIRED") return true;

  const days = getDaysRemaining(expirationDateStr, currentDate);
  return days !== null && days < 0;
}

/**
 * Format expiration status message
 * @param expirationDateStr - ISO date string
 * @param status - Profile status
 * @param currentDate - Reference date
 * @returns Formatted message
 */
export function getExpirationStatusMessage(
  expirationDateStr?: string,
  status?: string,
  currentDate?: Date
): string {
  const days = getDaysRemaining(expirationDateStr, currentDate);

  if (status === "EXPIRED" || (days !== null && days < 0)) {
    return "Expired";
  }

  if (days === null) {
    return "No expiration date";
  }

  if (days === 0) {
    return "Expires today";
  }

  if (days === 1) {
    return "Expires tomorrow";
  }

  return `Expires in ${days} days`;
}

/**
 * Parse date string to readable format
 * @param dateStr - ISO date string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  return new Date(dateStr).toLocaleDateString("en-US", options);
}
