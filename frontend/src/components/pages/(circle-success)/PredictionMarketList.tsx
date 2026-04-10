"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HiOutlineArrowRight, HiOutlineClock } from "react-icons/hi2";
import { TbTargetArrow } from "react-icons/tb";
import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import { MOCK_USERS } from "@/lib/mockUsers";

const markets = [
  {
    title: "Will Sandra get a job in 2026?",
    user: MOCK_USERS.sandra,
    stake: "0.50",
    participants: 12,
    deadline: "2d 4h",
    status: "active",
  },
  {
    title: "Will Andero run a marathon this year?",
    user: MOCK_USERS.andero,
    stake: "1.00",
    participants: 8,
    deadline: "5d 12h",
    status: "active",
  },
  {
    title: "Will Greg learn Spanish in 3 months?",
    user: MOCK_USERS.greg,
    stake: "0.25",
    participants: 4,
    deadline: "1d 8h",
    status: "closing",
  },
];

export default function PredictionMarketList() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Circle Goals</p>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium text-muted cursor-pointer"
        >
          View all
          <HiOutlineArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {markets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-10 px-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 mb-3">
            <TbTargetArrow className="w-6 h-6 text-muted" />
          </div>
          <p className="text-sm font-semibold text-main-text mb-1">No goals yet</p>
          <p className="text-xs text-muted text-center">
            Create your first goal to get started
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {markets.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 * i }}
            >
              <Link
                href="/prediction-detail"
                className="flex items-center gap-3 rounded-2xl bg-white p-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
              >
                <EmojiAvatar avatar={m.user.avatar} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-main-text truncate">{m.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted inline-flex items-center gap-1">
                      {m.stake} <UsdtLabel size={12} />
                    </span>
                    <span className="text-xs text-muted">·</span>
                    <span className="text-xs text-muted">{m.participants} joined</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1">
                    <HiOutlineClock className={`w-3.5 h-3.5 ${m.status === "closing" ? "text-red-400" : "text-muted"}`} />
                    <span className={`text-xs font-medium ${m.status === "closing" ? "text-red-400" : "text-main-text"}`}>
                      {m.deadline}
                    </span>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                      m.status === "closing"
                        ? "bg-red-50 text-red-400"
                        : "bg-emerald-50 text-emerald-500"
                    }`}
                  >
                    {m.status === "closing" ? "Closing" : "Active"}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
