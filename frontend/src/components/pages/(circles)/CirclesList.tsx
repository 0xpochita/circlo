"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HiOutlineUserGroup, HiOutlineLockClosed, HiOutlineGlobeAlt } from "react-icons/hi2";
import { TbTargetArrow } from "react-icons/tb";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import { MOCK_USERS } from "@/lib/mockUsers";
import type { User, UserAvatar } from "@/types";

type Circle = {
  name: string;
  description: string;
  members: number;
  activeGoals: number;
  privacy: "private" | "public";
  avatar: UserAvatar;
  previewMembers: User[];
};

const circles: Circle[] = [
  {
    name: "Friends 2026",
    description: "Goals with my closest friends",
    members: 12,
    activeGoals: 5,
    privacy: "private",
    avatar: { emoji: "🌟", color: "#fbbf24" },
    previewMembers: [MOCK_USERS.sandra, MOCK_USERS.andero, MOCK_USERS.greg],
  },
  {
    name: "Fitness Squad",
    description: "Workout and health goals",
    members: 8,
    activeGoals: 3,
    privacy: "public",
    avatar: { emoji: "⚡", color: "#f87171" },
    previewMembers: [MOCK_USERS.tommy, MOCK_USERS.natalie, MOCK_USERS.emma],
  },
  {
    name: "Career Growth",
    description: "Professional development circle",
    members: 6,
    activeGoals: 4,
    privacy: "private",
    avatar: { emoji: "🚀", color: "#60a5fa" },
    previewMembers: [MOCK_USERS.james, MOCK_USERS.daniel],
  },
];

export default function CirclesList() {
  if (circles.length === 0) {
    return (
      <div className="px-4 py-2">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
            <HiOutlineUserGroup className="w-7 h-7 text-muted" />
          </div>
          <p className="text-base font-semibold text-main-text mb-1">No circles yet</p>
          <p className="text-sm text-muted text-center mb-4">
            Create your first circle to start predicting goals with friends
          </p>
          <Link
            href="/create-circle"
            className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white cursor-pointer"
          >
            Create Circle
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      {circles.map((circle, i) => (
        <motion.div
          key={circle.name}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 * i }}
        >
          <Link
            href="/circle-success"
            className="flex flex-col rounded-2xl bg-white p-4 cursor-pointer transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <EmojiAvatar avatar={circle.avatar} size={48} shape="square" />
                <div>
                  <p className="text-base font-bold text-main-text">{circle.name}</p>
                  <p className="text-xs text-muted">{circle.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1">
                {circle.privacy === "private" ? (
                  <HiOutlineLockClosed className="w-3 h-3 text-muted" />
                ) : (
                  <HiOutlineGlobeAlt className="w-3 h-3 text-muted" />
                )}
                <span className="text-[10px] font-medium text-muted capitalize">
                  {circle.privacy}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-50 pt-3">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {circle.previewMembers.map((member) => (
                    <div
                      key={`${circle.name}-${member.username}`}
                      className="rounded-full border-2 border-white"
                    >
                      <EmojiAvatar avatar={member.avatar} size={28} />
                    </div>
                  ))}
                </div>
                {circle.members > circle.previewMembers.length && (
                  <span className="text-xs text-muted">
                    +{circle.members - circle.previewMembers.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <TbTargetArrow className="w-4 h-4 text-muted" />
                <span className="text-xs text-muted">{circle.activeGoals} active goals</span>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
