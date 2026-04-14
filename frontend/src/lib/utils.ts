import type { UserAvatar } from "@/types";

export function parseAvatar(avatarString: string | null): UserAvatar {
  if (!avatarString) return { emoji: "\u{1F31F}", color: "#1a1a1a" };
  const parts = avatarString.split("|");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { emoji: parts[0], color: parts[1] };
  }
  return { emoji: "\u{1F31F}", color: "#1a1a1a" };
}

export function toAvatar(
  emoji: string | null | undefined,
  color: string | null | undefined
): UserAvatar {
  return {
    emoji: emoji || "\u{1F31F}",
    color: color || "#1a1a1a",
  };
}

export function formatTimeLeft(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}
