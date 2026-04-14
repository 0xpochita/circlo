"use client";

import { motion } from "framer-motion";
import { HiCheck } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import { toAvatar } from "@/lib/utils";
import type { CircleDetailResponse } from "@/lib/api/endpoints";
import type { UserAvatar } from "@/types";

const defaultPositions: { avatar: UserAvatar; x: number; y: number; size: number }[] = [
  { avatar: { emoji: "🚀", color: "#6366f1" }, x: 0, y: 0, size: 72 },
  { avatar: { emoji: "🌟", color: "#f59e0b" }, x: 78, y: -8, size: 72 },
  { avatar: { emoji: "🔥", color: "#ef4444" }, x: 156, y: 4, size: 72 },
  { avatar: { emoji: "🎯", color: "#10b981" }, x: 28, y: 64, size: 68 },
  { avatar: { emoji: "💡", color: "#8b5cf6" }, x: 104, y: 68, size: 68 },
];

const layoutPositions = [
  { x: 0, y: 0, size: 72 },
  { x: 78, y: -8, size: 72 },
  { x: 156, y: 4, size: 72 },
  { x: 28, y: 64, size: 68 },
  { x: 104, y: 68, size: 68 },
];

type SuccessHeroProps = {
  circle?: CircleDetailResponse | null;
};

export default function SuccessHero({ circle }: SuccessHeroProps) {
  const circleName = circle?.name ?? "Your Circle";
  const circleAvatar = circle
    ? toAvatar(circle.avatarEmoji, circle.avatarColor)
    : null;

  const memberAvatars = circle?.membersPreview?.length
    ? circle.membersPreview.slice(0, 5).map((m, i) => ({
        avatar: toAvatar(m.user.avatarEmoji, m.user.avatarColor),
        ...layoutPositions[i % layoutPositions.length],
      }))
    : defaultPositions;

  return (
    <div className="px-4 py-2">
      <div className="mb-4 flex items-center gap-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500"
        >
          <HiCheck className="w-4 h-4 text-white" />
        </motion.div>
        <p className="text-xs font-medium text-emerald-500 uppercase tracking-wide">Circle Created</p>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          {circleAvatar && <EmojiAvatar avatar={circleAvatar} size={32} shape="square" />}
          <h1 className="text-2xl font-bold tracking-tight text-main-text">{circleName}</h1>
        </div>
        <p className="text-sm text-muted">
          {circle?.description || "Your circle is ready. Invite more friends to grow your community."}
        </p>
      </div>

      <div className="w-full rounded-2xl bg-white p-2">
        <div className="rounded-2xl bg-gray-50 py-10">
          <div className="relative mx-auto h-40 w-60">
            {memberAvatars.map((p, i) => (
              <motion.div
                key={`member-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring" as const,
                  stiffness: 300,
                  damping: 20,
                  delay: 0.15 * i,
                }}
                className="absolute"
                style={{ left: p.x, top: p.y }}
              >
                <EmojiAvatar avatar={p.avatar} size={p.size} className="border-4 border-white" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
