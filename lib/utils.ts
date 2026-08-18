import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats order type to user-friendly label
 */
export function formatOrderType(orderType: string | null | undefined): string {
  if (!orderType) return "Reviews";

  switch (orderType) {
    case "REVIEW":
      return "Reviews";
    case "COMMENT":
      return "Reactions";
    case "COMMENT_WITH_PHOTO":
      return "Photo + Reviews";
    default:
      return orderType.replace(/_/g, " ");
  }
}
