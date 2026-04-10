"use client";

import { motion } from "framer-motion";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import { MOCK_USERS } from "@/lib/mockUsers";

const members = [
  { user: MOCK_USERS.sandra, role: "Admin" },
  { user: MOCK_USERS.andero, role: "Member" },
  { user: MOCK_USERS.greg, role: "Member" },
  { user: MOCK_USERS.tommy, role: "Member" },
];

export default function DetailsMembers() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Members</p>
        <span className="text-xs text-muted">128 total</span>
      </div>

      <div className="rounded-2xl bg-white divide-y divide-gray-50">
        {members.map((m, i) => (
          <motion.div
            key={m.user.username}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <EmojiAvatar avatar={m.user.avatar} size={40} />
              <div>
                <p className="text-sm font-semibold text-main-text">{m.user.name}</p>
                <p className="text-xs text-muted">{m.user.username}</p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                m.role === "Admin"
                  ? "bg-brand text-white"
                  : "bg-gray-50 text-muted"
              }`}
            >
              {m.role}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <button
          type="button"
          className="rounded-full border border-gray-100 bg-white px-6 py-2 text-sm font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
        >
          View All Members
        </button>
      </div>
    </div>
  );
}
