/**
 * Status utility functions for consistent badge styling
 */

export type ProfileStatus = "AVAILABLE" | "ASSIGNED" | "ACTIVE" | "EXPIRED" | "BANNED" | "CANCELLED" | "REQUEST_CHANGE";
export type ClientStatus = "ACTIVE" | "PENDING" | "DEACTIVATED";
export type OrderStatus = "PENDING" | "PAID" | "FAILED";

/**
 * Get badge styling classes for profile status
 */
export function getProfileStatusBadgeStyle(status?: ProfileStatus, isExpiringSoon?: boolean, isExpired?: boolean): string {
  if (status === "AVAILABLE") {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  }
  if (status === "ASSIGNED") {
    return "bg-sky-500/10 text-sky-700 dark:text-sky-400";
  }
  if (status === "ACTIVE") {
    if (isExpiringSoon) {
      return "bg-[#EAF7FB] text-[#0F7493] border-[#168BB0]/20 dark:bg-[#168BB0]/20 dark:text-[#45B0D2] dark:border-[#168BB0]/40";
    }
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (status === "EXPIRED" || isExpired) {
    return "bg-red-500/10 text-red-700 dark:text-red-400 animate-pulse";
  }
  if (status === "REQUEST_CHANGE") {
    return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
  }
  if (status === "BANNED") {
    return "bg-red-500/15 text-red-800 dark:text-red-400";
  }
  if (status === "CANCELLED") {
    return "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400";
  }

  return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
}

/**
 * Get badge styling classes for client status
 */
export function getClientStatusBadgeStyle(status?: ClientStatus): string {
  if (status === "ACTIVE") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (status === "PENDING") {
    return "bg-[#168BB0]/15 text-[#0F7493] dark:text-[#45B0D2] animate-pulse";
  }
  if (status === "DEACTIVATED") {
    return "bg-red-500/10 text-red-700 dark:text-red-400";
  }

  return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
}

/**
 * Get badge styling classes for order status
 */
export function getOrderStatusBadgeStyle(status?: OrderStatus): string {
  if (status === "PAID") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  }
  if (status === "PENDING") {
    return "bg-[#168BB0]/15 text-[#0F7493] dark:text-[#45B0D2]";
  }
  if (status === "FAILED") {
    return "bg-red-500/15 text-red-700 dark:text-red-400";
  }

  return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
}

/**
 * Get readable status label
 */
export function getStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    AVAILABLE: "Available",
    ASSIGNED: "Assigned",
    ACTIVE: "Active",
    EXPIRED: "Expired",
    BANNED: "Banned",
    CANCELLED: "Cancelled",
    REQUEST_CHANGE: "Change Requested",
    PENDING: "Pending",
    DEACTIVATED: "Deactivated",
    PAID: "Paid",
    FAILED: "Failed",
  };

  return labels[status || ""] || status || "Unknown";
}

/**
 * Check if status is active/valid
 */
export function isStatusActive(status?: string): boolean {
  return status === "ACTIVE" || status === "PAID";
}

/**
 * Check if status indicates pending action
 */
export function isPendingStatus(status?: string): boolean {
  return status === "PENDING" || status === "REQUEST_CHANGE";
}
