import type { UserAvatar } from "@/types";

/** Default avatar (white star on near-black) when no data exists. */
const DEFAULT_EMOJI = "\u{1F31F}"; // 🌟
const DEFAULT_COLOR = "#1a1a1a";

/**
 * Parse the pipe-delimited "{emoji}|{color}" string the backend
 * stores under `User.avatar` back into a typed `UserAvatar`. Falls
 * back to the default star/dark-grey pair on malformed or missing
 * input — never throws.
 */
export function parseAvatar(avatarString: string | null): UserAvatar {
  if (!avatarString) return { emoji: DEFAULT_EMOJI, color: DEFAULT_COLOR };
  const parts = avatarString.split("|");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { emoji: parts[0], color: parts[1] };
  }
  return { emoji: DEFAULT_EMOJI, color: DEFAULT_COLOR };
}

/**
 * Build a `UserAvatar` from the separate `avatarEmoji` + `avatarColor`
 * columns the backend returns from many list endpoints. Either null
 * input slot falls back to the default — matches `parseAvatar`'s
 * never-throw contract.
 */
export function toAvatar(
  emoji: string | null | undefined,
  color: string | null | undefined,
): UserAvatar {
  return {
    emoji: emoji || DEFAULT_EMOJI,
    color: color || DEFAULT_COLOR,
  };
}

/**
 * Coerce a stake/vote side (which the backend can return as either
 * `"yes"`/`"no"` strings or raw 0/1 from the chain) into the
 * 2-element enum the UI uses.
 *
 * NOTE: this function uses the UI convention where the returned
 * `0` represents the YES-equivalent column in the rendered grid
 * and `1` represents NO. The on-chain `PredictionPool.stake(side)`
 * argument uses the inverse convention (`0 = NO`, `1 = YES`) — do
 * not pass this return value into a contract write without
 * remapping. All current call sites only use it for UI rendering
 * (`sideLabel`, win-side comparison) where both inputs go through
 * the same normaliser, so the convention stays internally
 * consistent.
 */
export function normalizeSide(
  side: string | number | null | undefined,
): 0 | 1 | null {
  if (side === null || side === undefined) return null;
  if (typeof side === "number") return side === 0 ? 0 : side === 1 ? 1 : null;
  const lower = String(side).toLowerCase();
  if (lower === "yes" || lower === "0") return 0;
  if (lower === "no" || lower === "1") return 1;
  return null;
}

export const MS_PER_DAY = 86_400_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_MINUTE = 60_000;

/**
 * Render a deadline timestamp as a compact countdown string for
 * goal cards: `2d 5h`, `5h 12m`, or `Ended` for past deadlines.
 * Truncates to two unit-pairs so the string never wraps in
 * narrow MiniPay layout cells.
 */
export function formatTimeLeft(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / MS_PER_DAY);
  const hours = Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE);
  return `${hours}h ${mins}m`;
}
