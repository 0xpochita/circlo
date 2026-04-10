"use client";

import { motion } from "framer-motion";
import { HiOutlineClock, HiOutlineUserGroup } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import { MOCK_USERS } from "@/lib/mockUsers";

export default function DetailHero() {
  const sandra = MOCK_USERS.sandra;

  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl bg-white p-2">
        <div className="rounded-2xl bg-gray-50 p-6">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
              className="mb-4"
            >
              <EmojiAvatar avatar={sandra.avatar} size={72} />
            </motion.div>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-500 mb-2">
              Active Goal
            </span>
            <h1 className="text-xl font-bold text-main-text mb-1">
              Will Sandra get a job in 2026?
            </h1>
            <p className="text-sm text-muted max-w-xs">
              Sandra is actively applying and interviewing. Circle members stake on whether she lands a role before Dec 31.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <HiOutlineClock className="w-4 h-4 text-muted" />
              <span className="text-xs font-medium text-main-text">2d 4h left</span>
            </div>
            <div className="h-3 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <HiOutlineUserGroup className="w-4 h-4 text-muted" />
              <span className="text-xs font-medium text-main-text">12 joined</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
