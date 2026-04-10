"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HiOutlineClock, HiOutlineArrowRight } from "react-icons/hi2";
import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import { MOCK_USERS } from "@/lib/mockUsers";

const goals = [
  {
    title: "Will Sandra hit her savings target?",
    user: MOCK_USERS.sandra,
    stake: "0.50",
    participants: 12,
    deadline: "2d 4h",
  },
  {
    title: "Will Andero finish his book by May?",
    user: MOCK_USERS.andero,
    stake: "1.00",
    participants: 8,
    deadline: "5d 12h",
  },
];

export default function DetailsGoals() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Active Goals</p>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium text-muted cursor-pointer"
        >
          View all
          <HiOutlineArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {goals.map((g, i) => (
          <motion.div
            key={g.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 * i }}
          >
            <Link
              href="/prediction-detail"
              className="flex items-center gap-3 rounded-2xl bg-white p-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
            >
              <EmojiAvatar avatar={g.user.avatar} size={48} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-main-text truncate">{g.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted inline-flex items-center gap-1">
                    {g.stake} <UsdtLabel size={12} />
                  </span>
                  <span className="text-xs text-muted">·</span>
                  <span className="text-xs text-muted">{g.participants} joined</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <HiOutlineClock className="w-3.5 h-3.5 text-muted" />
                <span className="text-xs font-medium text-main-text">{g.deadline}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
