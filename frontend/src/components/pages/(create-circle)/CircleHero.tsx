"use client";

import { motion } from "framer-motion";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import type { UserAvatar } from "@/types";

const positions: { avatar: UserAvatar; x: number; y: number; size: number; key: string }[] = [
  { avatar: { emoji: "\u{1F680}", color: "#6366f1" }, x: 0, y: 0, size: 72, key: "a" },
  { avatar: { emoji: "\u{1F31F}", color: "#f59e0b" }, x: 78, y: -8, size: 72, key: "b" },
  { avatar: { emoji: "\u{1F525}", color: "#ef4444" }, x: 156, y: 4, size: 72, key: "c" },
  { avatar: { emoji: "\u{1F3AF}", color: "#10b981" }, x: 28, y: 64, size: 68, key: "d" },
  { avatar: { emoji: "\u{1F4A1}", color: "#8b5cf6" }, x: 104, y: 68, size: 68, key: "e" },
];

export default function CircleHero() {
  return (
    <div className="flex flex-col items-center px-4 py-4">
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
                  delay: 0.15 * i,
                }}
                className="absolute"
                style={{
                  left: p.x,
                  top: p.y,
                }}
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
