"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HiXMark } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared";
import type { NotificationResponse } from "@/lib/api/endpoints";
import { useNotificationStore } from "@/stores/notificationStore";
import type { UserAvatar } from "@/types";

const TYPE_AVATARS: Record<string, UserAvatar> = {
  goal_created: { emoji: "\u{1F3AF}", color: "#60a5fa" },
  goal_staked: { emoji: "\u{1F4B0}", color: "#fbbf24" },
  goal_locked: { emoji: "\u{1F512}", color: "#a78bfa" },
  goal_resolved: { emoji: "\u2705", color: "#34d399" },
  goal_claimed: { emoji: "\u{1F389}", color: "#ec4899" },
  circle_invite: { emoji: "\u{1F4E9}", color: "#60a5fa" },
  member_joined: { emoji: "\u{1F91D}", color: "#34d399" },
  referral_reward: { emoji: "\u{1F381}", color: "#f87171" },
};

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type NotificationSheetProps = {
  open: boolean;
  onClose: () => void;
};

export default function NotificationSheet({
  open,
  onClose,
}: NotificationSheetProps) {
  const router = useRouter();
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      fetchNotifications();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, fetchNotifications]);

  function getNavigationPath(n: NotificationResponse): string | null {
    if (!n.entityId) return null;
    if (n.type === "circle.joined" || n.type === "circle.invited") {
      return `/circle-details?id=${n.entityId}`;
    }
    if (n.type === "goal.created" || n.type === "goal.resolved") {
      return `/prediction-detail?id=${n.entityId}`;
    }
    return null;
  }

  async function handleTap(n: NotificationResponse) {
    if (n.unread) {
      await markAsRead(n.id);
    }
    const path = getNavigationPath(n);
    if (path) {
      onClose();
      router.push(path);
    }
  }

  async function handleMarkAllRead() {
    await markAllAsRead();
  }

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
            transition={{
              type: "spring" as const,
              stiffness: 300,
              damping: 32,
            }}
            className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 flex flex-col rounded-t-3xl bg-white"
            style={{ maxHeight: "85dvh" }}
          >
            <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-main-text">
                  Notifications
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {unreadCount > 0
                    ? `You have ${unreadCount} new notification${unreadCount !== 1 ? "s" : ""}`
                    : "You're all caught up"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="rounded-full bg-gray-50 px-3 py-2 text-xs font-semibold text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-[0.95]"
                >
                  <HiXMark className="w-5 h-5 text-main-text" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8">
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-2xl bg-gray-100 h-[80px]"
                    />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4 text-3xl">
                    🔔
                  </div>
                  <p className="text-base font-semibold text-main-text mb-1">
                    No notifications yet
                  </p>
                  <p className="text-sm text-muted">
                    You&apos;ll see updates about your circles and goals here
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {notifications.map((n, i) => (
                    <motion.div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleTap(n)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") handleTap(n);
                      }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.05 * i }}
                      className={`flex items-start gap-3 rounded-2xl p-3 cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                        n.unread ? "bg-gray-50" : "bg-white"
                      }`}
                    >
                      <EmojiAvatar
                        avatar={
                          TYPE_AVATARS[n.type] ?? {
                            emoji: "\u{1F514}",
                            color: "#94a3b8",
                          }
                        }
                        size={44}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-main-text truncate">
                            {n.title}
                          </p>
                          {n.unread && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
                          )}
                        </div>
                        <p className="text-xs text-muted truncate">
                          {n.description}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          {formatTime(n.createdAt)}
                        </p>
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
