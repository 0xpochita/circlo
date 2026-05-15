import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotifCategory =
  | "circle"
  | "goal"
  | "payout"
  | "referral";

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

export function isNotificationEnabled(
  type: string,
  prefs: NotifPrefs,
): boolean {
  const category = TYPE_TO_CATEGORY[type];
  if (!category) return true;
  return prefs[category];
}
