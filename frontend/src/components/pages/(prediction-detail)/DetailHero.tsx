"use client";

import { motion } from "framer-motion";
import { HiOutlineClock, HiOutlineUserGroup } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import { toAvatar, formatTimeLeft } from "@/lib/utils";

type DetailHeroProps = {
  title?: string;
  description?: string | null;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
  deadline?: string;
  participantCount?: number;
  status?: string;
};

export default function DetailHero({
  title = "Goal",
  description = null,
  avatarEmoji = null,
  avatarColor = null,
  deadline = new Date().toISOString(),
  participantCount = 0,
  status = "active",
}: DetailHeroProps) {
  const statusLabel = status === "active" ? "Active Goal" : status.charAt(0).toUpperCase() + status.slice(1);
  const statusClass =
    status === "active"
      ? "bg-emerald-50 text-emerald-500"
      : status === "resolved"
        ? "bg-blue-50 text-blue-500"
        : "bg-gray-100 text-muted";

  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl bg-white p-2">
        <div className="rounded-2xl bg-gray-50 p-6">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
              className="mb-4"
            >
              <EmojiAvatar avatar={toAvatar(avatarEmoji, avatarColor)} size={72} />
            </motion.div>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium mb-2 ${statusClass}`}>
              {statusLabel}
            </span>
            <h1 className="text-xl font-bold text-main-text mb-1">{title}</h1>
            <p className="text-sm text-muted max-w-xs">{description || "No description provided"}</p>
          </div>

          <div className="mt-5 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <HiOutlineClock className="w-4 h-4 text-muted" />
              <span className="text-xs font-medium text-main-text">{formatTimeLeft(deadline)} left</span>
            </div>
            <div className="h-3 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <HiOutlineUserGroup className="w-4 h-4 text-muted" />
              <span className="text-xs font-medium text-main-text">{participantCount} joined</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
