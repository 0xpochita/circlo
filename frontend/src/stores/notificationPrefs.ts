import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotifCategory = "circle" | "goal" | "payout" | "referral";

export type NotifPrefs = Record<NotifCategory, boolean>;

const DEFAULTS: NotifPrefs = {
  circle: true,
  goal: true,
  payout: true,
  referral: true,
};

type NotifPrefsState = {
  prefs: NotifPrefs;
  toggle: (key: NotifCategory) => void;
  setAll: (value: boolean) => void;
  reset: () => void;
};

/**
 * Per-category notification preferences, persisted to localStorage.
 *
 * All four categories default to ON — opt-out model, not opt-in.
 * Persisted under `circlo-notification-prefs` so settings survive
 * a session restart (vs. notifications themselves which re-fetch).
 *
 * The `setAll` helper exists so the settings UI can offer a single
 * "mute everything" toggle without iterating categories manually.
 */
export const useNotificationPrefs = create<NotifPrefsState>()(
  persist(
    (set) => ({
      prefs: DEFAULTS,
      toggle: (key) =>
        set((state) => ({
          prefs: { ...state.prefs, [key]: !state.prefs[key] },
        })),
      setAll: (value) =>
        set(() => ({
          prefs: { circle: value, goal: value, payout: value, referral: value },
        })),
      reset: () => set({ prefs: DEFAULTS }),
    }),
    {
      name: "circlo-notification-prefs",
    },
  ),
);

/**
 * Mapping from backend notification `type` to the user-facing
 * category toggle that gates it.
 *
 * Add new notification types here when the backend adds them; an
 * unmapped type falls through to `true` (always shown) so a
 * brand-new event never gets silently muted by a stale mapping.
 */
const TYPE_TO_CATEGORY: Record<string, NotifCategory> = {
  goal_created: "goal",
  goal_staked: "goal",
  goal_locked: "goal",
  goal_resolved: "payout",
  goal_claimed: "payout",
  circle_invite: "circle",
  member_joined: "circle",
  referral_reward: "referral",
};

/**
 * Decide whether a notification of `type` should be surfaced under
 * the user's current preferences.
 *
 * Used by `useNotificationStore.fetchNotifications` to filter
 * server-pushed events before they hit the UI. Pair with
 * `useNotificationPrefs.getState().prefs` at the call site so the
 * function stays a pure helper.
 */
export function isNotificationEnabled(
  type: string,
  prefs: NotifPrefs,
): boolean {
  const category = TYPE_TO_CATEGORY[type];
  if (!category) return true;
  return prefs[category];
}
