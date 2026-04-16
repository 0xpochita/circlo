"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  HiCheck,
  HiOutlineDocumentDuplicate,
  HiOutlineLockClosed,
} from "react-icons/hi2";
import { toast } from "sonner";
import { EmojiAvatar } from "@/components/shared";
import type { CircleDetailResponse, MemberResponse } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";
import type { UserAvatar } from "@/types";

type DetailsHeroProps = {
  circle?: CircleDetailResponse;
};

const defaultPositions: {
  avatar: UserAvatar;
  x: number;
  y: number;
  size: number;
  key: string;
}[] = [
  {
    avatar: { emoji: "\u{1F680}", color: "#6366f1" },
    x: 0,
    y: 0,
    size: 72,
    key: "a",
  },
  {
    avatar: { emoji: "\u{1F31F}", color: "#f59e0b" },
    x: 78,
    y: -8,
    size: 72,
    key: "b",
  },
  {
    avatar: { emoji: "\u{1F525}", color: "#ef4444" },
    x: 156,
    y: 4,
    size: 72,
    key: "c",
  },
  {
    avatar: { emoji: "\u{1F3AF}", color: "#10b981" },
    x: 28,
    y: 64,
    size: 68,
    key: "d",
  },
  {
    avatar: { emoji: "\u{1F4A1}", color: "#8b5cf6" },
    x: 104,
    y: 68,
    size: 68,
    key: "e",
  },
];

const layoutCoords = [
  { x: 0, y: 0, size: 72 },
  { x: 78, y: -8, size: 72 },
  { x: 156, y: 4, size: 72 },
  { x: 28, y: 64, size: 68 },
  { x: 104, y: 68, size: 68 },
];

function buildPositions(members?: MemberResponse[]) {
  if (!members || members.length === 0) return defaultPositions;
  return members.slice(0, 5).map((m, i) => ({
    avatar: toAvatar(m.user.avatarEmoji, m.user.avatarColor),
    ...layoutCoords[i % layoutCoords.length],
    key: m.userId,
  }));
}

export default function DetailsHero({ circle }: DetailsHeroProps) {
  const positions = buildPositions(circle?.membersPreview);
  const [copied, setCopied] = useState(false);

  async function handleCopyCode() {
    if (!circle?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(circle.inviteCode);
      setCopied(true);
      toast("Invite code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="px-4 py-2">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-muted uppercase tracking-wide">
            {circle?.category || "General"}
          </span>
          <div className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5">
            <HiOutlineLockClosed className="w-3 h-3 text-muted" />
            <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
              {circle?.privacy || "Public"}
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-main-text">
          {circle?.name || "Circle"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {circle?.description || "No description"}
        </p>

        {circle?.inviteCode && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wide">
                Invite Code
              </p>
              <p className="text-sm font-bold text-main-text tracking-wider">
                {circle.inviteCode}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
            >
              {copied ? (
                <>
                  <HiCheck className="w-3.5 h-3.5" /> Copied
                </>
              ) : (
                <>
                  <HiOutlineDocumentDuplicate className="w-3.5 h-3.5" /> Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="w-full rounded-2xl bg-white p-2">
        <div className="rounded-2xl bg-gray-50 py-10">
          <div className="relative mx-auto h-40 w-60">
            {positions.map((p, i) => (
              <motion.div
                key={p.key}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring" as const,
                  stiffness: 300,
                  damping: 20,
                  delay: 0.1 * i,
                }}
                className="absolute"
                style={{
                  left: p.x,
                  top: p.y,
                }}
              >
                <EmojiAvatar
                  avatar={p.avatar}
                  size={p.size}
                  className="border-4 border-white"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
