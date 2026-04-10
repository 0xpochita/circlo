"use client";

import { motion } from "framer-motion";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import { MOCK_USERS } from "@/lib/mockUsers";

const activities = [
  { user: MOCK_USERS.emma, status: "Verified", earned: "1 USDm earned", time: "2h ago" },
  { user: MOCK_USERS.james, status: "Pending", earned: "1 USDm earned", time: "2h ago" },
  { user: MOCK_USERS.daniel, status: "Verified", earned: "1 USDm earned", time: "2h ago" },
];

export default function RecentActivity() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Recent Activity</p>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-white cursor-pointer"
        >
          <HiOutlineAdjustmentsHorizontal className="w-4 h-4 text-main-text" />
        </button>
      </div>

      <div className="rounded-2xl bg-white divide-y divide-gray-50">
        {activities.map((a, i) => (
          <motion.div
            key={a.user.username}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            className="flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <EmojiAvatar avatar={a.user.avatar} size={40} />
              <div>
                <p className="text-sm font-semibold text-main-text">{a.user.name}</p>
                <span
                  className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${
                    a.status === "Verified"
                      ? "bg-emerald-50 text-emerald-500"
                      : "bg-amber-50 text-amber-500"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-emerald-500">{a.earned}</p>
              <p className="text-xs text-muted">{a.time}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-center pt-5">
        <button
          type="button"
          className="rounded-full border border-gray-100 bg-white px-6 py-2 text-sm font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
        >
          View All
        </button>
      </div>
    </div>
  );
}
