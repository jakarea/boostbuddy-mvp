/**
 * Reaction Types and Display Utilities
 * Facebook Reactions: LIKE, LOVE, CARE, WOW
 */

export type ReactionType = "LIKE" | "LOVE" | "CARE" | "WOW";

export interface Reaction {
  type: ReactionType;
  emoji: string;
  label: string;
  color: string;
}

export const REACTIONS: Reaction[] = [
  { type: "LIKE", emoji: "👍", label: "Like", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { type: "LOVE", emoji: "❤️", label: "Love", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  { type: "CARE", emoji: "🤗", label: "Care", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { type: "WOW", emoji: "😮", label: "Wow", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
];

/**
 * Get reaction details by type
 */
export function getReaction(type: ReactionType | string | undefined | null): Reaction {
  if (!type) return REACTIONS[0]; // Default to LIKE
  return REACTIONS.find(r => r.type === type) || REACTIONS[0];
}

/**
 * Get reaction emoji by type
 */
export function getReactionEmoji(type: ReactionType | string | undefined | null): string {
  return getReaction(type).emoji;
}

/**
 * Get reaction badge component classes
 */
export function getReactionBadgeClasses(type: ReactionType | string | undefined | null): string {
  const baseClasses = "px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1";
  const reaction = getReaction(type);
  return `${baseClasses} ${reaction.color}`;
}
