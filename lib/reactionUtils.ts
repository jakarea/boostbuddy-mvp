/**
 * Reaction Types and Display Utilities
 * Facebook Reactions: LIKE, LOVE, CARE, HAHA, WOW, SAD, ANGRY
 */

export type ReactionType = "LIKE" | "LOVE" | "CARE" | "HAHA" | "WOW" | "SAD" | "ANGRY";

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
  { type: "HAHA", emoji: "😂", label: "Haha", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { type: "WOW", emoji: "😮", label: "Wow", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { type: "SAD", emoji: "😢", label: "Sad", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400" },
  { type: "ANGRY", emoji: "😡", label: "Angry", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
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
