"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiXMark, HiOutlineBellAlert } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared";
import { MOCK_USERS } from "@/lib/mockUsers";
import type { User } from "@/types";

type Notification = {
  id: string;
  type: "goal" | "invite" | "reward" | "resolve";
  user: User;
  title: string;
  description: string;
  time: string;
  unread: boolean;
};

const notifications: Notification[] = [
  {
    id: "1",
    type: "goal",
    user: MOCK_USERS.sandra,
    title: "Sandra created a new goal",
    description: "Will Sandra get a job in 2026?",
    time: "2m ago",
    unread: true,
  },
  {
    id: "2",
    type: "invite",
    user: MOCK_USERS.andero,
    title: "Andero invited you",
    description: "Join the Fitness Squad circle",
    time: "1h ago",
    unread: true,
  },
  {
    id: "3",
    type: "reward",
    user: MOCK_USERS.greg,
    title: "You won 1.20 USDT",
    description: "Your prediction on Greg's goal was correct",
    time: "3h ago",
    unread: true,
  },
  {
    id: "4",
    type: "resolve",
    user: MOCK_USERS.tommy,
    title: "Tommy resolved a goal",
    description: "Valorant Champions — result: Yes",
    time: "1d ago",
    unread: false,
  },
  {
    id: "5",
    type: "goal",
    user: MOCK_USERS.natalie,
    title: "Natalie joined your circle",
    description: "Natalie is now in Friends 2026",
    time: "2d ago",
    unread: false,
  },
];

type NotificationSheetProps = {
  open: boolean;
  onClose: () => void;
};

export default function NotificationSheet({ open, onClose }: NotificationSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 32 }}
            className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 flex flex-col rounded-t-3xl bg-white"
            style={{ maxHeight: "85dvh" }}
          >
            <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-main-text">Notifications</h2>
                <p className="mt-1 text-sm text-muted">
                  {unreadCount > 0
                    ? `You have ${unreadCount} new notifications`
                    : "You're all caught up"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-[0.95]"
              >
                <HiXMark className="w-5 h-5 text-main-text" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
                    <HiOutlineBellAlert className="w-7 h-7 text-muted" />
                  </div>
                  <p className="text-base font-semibold text-main-text mb-1">No notifications</p>
                  <p className="text-sm text-muted">You&apos;re all caught up</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {notifications.map((n, i) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.05 * i }}
                      className={`flex items-start gap-3 rounded-2xl p-3 cursor-pointer transition-all duration-200 ${
                        n.unread ? "bg-gray-50" : "bg-white"
                      }`}
                    >
                      <EmojiAvatar avatar={n.user.avatar} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-main-text truncate">
                            {n.title}
                          </p>
                          {n.unread && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted">{n.user.username}</p>
                        <p className="text-xs text-muted truncate">{n.description}</p>
                        <p className="mt-1 text-[11px] text-muted">{n.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
