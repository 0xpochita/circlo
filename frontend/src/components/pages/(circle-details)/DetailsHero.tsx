"use client";

import { motion } from "framer-motion";
import { HiOutlineLockClosed } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import { MOCK_USERS } from "@/lib/mockUsers";

const positions = [
  { user: MOCK_USERS.andero, x: 0, y: 0, size: 72 },
  { user: MOCK_USERS.sandra, x: 78, y: -8, size: 72 },
  { user: MOCK_USERS.greg, x: 156, y: 4, size: 72 },
  { user: MOCK_USERS.tommy, x: 28, y: 64, size: 68 },
  { user: MOCK_USERS.natalie, x: 104, y: 68, size: 68 },
];

export default function DetailsHero() {
  return (
    <div className="px-4 py-2">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-muted uppercase tracking-wide">
            Crypto
          </span>
          <div className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5">
            <HiOutlineLockClosed className="w-3 h-3 text-muted" />
            <span className="text-[10px] font-medium text-muted uppercase tracking-wide">Public</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-main-text">Crypto Predictions</h1>
        <p className="mt-1 text-sm text-muted">
          Weekly goals on BTC, ETH and altcoin moves. Stake small, track together, win together.
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
                  delay: 0.1 * i,
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
