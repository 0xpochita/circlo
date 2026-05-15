"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  HiOutlineBell,
  HiOutlineBellAlert,
  HiOutlineChevronLeft,
  HiOutlineCurrencyDollar,
  HiOutlineGift,
  HiOutlineUsers,
} from "react-icons/hi2";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";
import {
  type NotifCategory,
  useNotificationPrefs,
} from "@/stores/notificationPrefs";

type CategoryConfig = {
  id: NotifCategory;
  title: string;
  description: string;
  icon: React.ReactNode;
  examples: string[];
};

const CATEGORIES: CategoryConfig[] = [
  {
    id: "circle",
    title: "Circle activity",
    description: "Invites and new members joining your circles",
    icon: <HiOutlineUsers className="w-5 h-5" />,
    examples: ["New invite received", "Member joined your circle"],
  },
  {
    id: "goal",
    title: "Goal activity",
    description: "New goals, stakes, and resolution events",
    icon: <HiOutlineBellAlert className="w-5 h-5" />,
    examples: ["New goal in your circle", "Someone staked", "Goal locked"],
  },
  {
    id: "payout",
    title: "Payouts & resolution",
    description: "When goals resolve and you can claim winnings",
    icon: <HiOutlineCurrencyDollar className="w-5 h-5" />,
    examples: ["Goal resolved", "Winnings ready to claim"],
  },
  {
    id: "referral",
    title: "Referral rewards",
    description: "When your referrals earn you a bonus",
    icon: <HiOutlineGift className="w-5 h-5" />,
    examples: ["Referral reward earned"],
  },
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const prefs = useNotificationPrefs((s) => s.prefs);
  const toggle = useNotificationPrefs((s) => s.toggle);
  const setAll = useNotificationPrefs((s) => s.setAll);

  const allEnabled = Object.values(prefs).every(Boolean);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-safe">
      <div className="flex items-center justify-between px-4 pt-safe pb-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-95"
        >
          <HiOutlineChevronLeft className="w-5 h-5 text-main-text" />
        </button>
        <p className="text-sm font-semibold text-main-text">Notifications</p>
        <div className="h-9 w-9" />
      </div>

      <PageTransition>
        <div className="px-4 py-2">
          <div className="rounded-2xl bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50">
                <HiOutlineBell className="w-5 h-5 text-main-text" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-main-text">
                  Manage notifications
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Choose which updates you want to receive from Circlo.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-main-text">
                  All notifications
                </p>
                <p className="text-xs text-muted">
                  {allEnabled ? "Currently enabled" : "Currently muted"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAll(!allEnabled)}
                className={`relative h-7 w-12 rounded-full transition-colors duration-200 cursor-pointer ${
                  allEnabled ? "bg-emerald-500" : "bg-gray-200"
                }`}
                aria-label={
                  allEnabled
                    ? "Disable all notifications"
                    : "Enable all notifications"
                }
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    allEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-2">
          <p className="px-2 pb-2 text-xs font-medium text-muted uppercase tracking-wide">
            Categories
          </p>
          <div className="flex flex-col gap-2">
            {CATEGORIES.map((cat, i) => {
              const enabled = prefs[cat.id];
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.04 * i }}
                  className="rounded-2xl bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                          enabled ? "bg-gray-900 text-white" : "bg-gray-50 text-muted"
                        }`}
                      >
                        {cat.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-main-text">
                          {cat.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {cat.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(cat.id)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 cursor-pointer ${
                        enabled ? "bg-emerald-500" : "bg-gray-200"
                      }`}
                      aria-label={`${enabled ? "Disable" : "Enable"} ${cat.title}`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                          enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="mt-3 ml-13 flex flex-wrap gap-1.5">
                    {cat.examples.map((ex) => (
                      <span
                        key={ex}
                        className="rounded-full bg-gray-50 px-2.5 py-1 text-xs text-muted"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="px-4 pt-4">
          <p className="text-xs text-muted text-center px-6">
            Notification preferences are stored locally on this device. They
            apply to the in-app notification feed.
          </p>
        </div>
      </PageTransition>
      <BottomTabBar />
    </div>
  );
}
