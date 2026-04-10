"use client";

import { motion } from "framer-motion";
import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import { MOCK_USERS } from "@/lib/mockUsers";

const participants = [
  { user: MOCK_USERS.sandra, stake: "0.50", side: "Yes" },
  { user: MOCK_USERS.andero, stake: "1.00", side: "No" },
  { user: MOCK_USERS.greg, stake: "0.25", side: "Yes" },
  { user: MOCK_USERS.tommy, stake: "0.75", side: "Yes" },
];

export default function ParticipantList() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Participants</p>
        <span className="text-xs text-muted">{participants.length} joined</span>
      </div>
      <div className="rounded-2xl bg-white divide-y divide-gray-50">
        {participants.map((p, i) => (
          <motion.div
            key={p.user.username}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <EmojiAvatar avatar={p.user.avatar} size={40} />
              <div>
                <p className="text-sm font-semibold text-main-text">{p.user.name}</p>
                <p className="text-xs text-muted">{p.user.username}</p>
                <p className="text-xs text-muted inline-flex items-center gap-1">
                  Staked {p.stake} <UsdtLabel size={11} />
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                p.side === "Yes"
                  ? "bg-emerald-50 text-emerald-500"
                  : "bg-red-50 text-red-400"
              }`}
            >
              {p.side}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
