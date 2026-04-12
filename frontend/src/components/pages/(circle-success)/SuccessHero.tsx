"use client";

import { motion } from "framer-motion";
import { HiCheck } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import { MOCK_USERS } from "@/lib/mockUsers";

const positions = [
  { user: MOCK_USERS.andero, x: 0, y: 0, size: 72 },
  { user: MOCK_USERS.sandra, x: 78, y: -8, size: 72 },
  { user: MOCK_USERS.greg, x: 156, y: 4, size: 72 },
  { user: MOCK_USERS.tommy, x: 28, y: 64, size: 68 },
  { user: MOCK_USERS.natalie, x: 104, y: 68, size: 68 },
];

export default function SuccessHero() {
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
        <h1 className="text-2xl font-bold tracking-tight text-main-text">Crypto Circle</h1>
        <p className="mt-1 text-sm text-muted">
          Your circle is ready. Invite more friends to grow your community.
        </p>
      </div>

      <div className="w-full rounded-2xl bg-white p-2">
        <div className="rounded-2xl bg-gray-50 py-10">
          <div className="relative mx-auto h-40 w-60">
            {positions.map((p, i) => (
              <motion.div
                key={p.user.username}
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
                <EmojiAvatar avatar={p.user.avatar} size={p.size} className="border-4 border-white" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
