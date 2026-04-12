"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { useState } from "react";
import { EmojiAvatar } from "@/components/shared";
import type { UserAvatar } from "@/types";

type Circle = {
  name: string;
  members: number;
  description: string;
  avatar: UserAvatar;
};

const circles: Circle[] = [
  {
    name: "Crypto Predictions",
    members: 128,
    description: "Predict BTC, ETH & altcoin prices weekly",
    avatar: { emoji: "💎", color: "#60a5fa" },
  },
  {
    name: "Fitness Goals",
    members: 64,
    description: "Challenge friends on workout streaks",
    avatar: { emoji: "⚡", color: "#f87171" },
  },
  {
    name: "Gaming Arena",
    members: 256,
    description: "Predict match results & tournament winners",
    avatar: { emoji: "🎮", color: "#a78bfa" },
  },
  {
    name: "World Events",
    members: 89,
    description: "Predict news, elections & global trends",
    avatar: { emoji: "🌈", color: "#34d399" },
  },
  {
    name: "Music Charts",
    members: 42,
    description: "Guess next #1 hits & award winners",
    avatar: { emoji: "🎧", color: "#fbbf24" },
  },
];

export default function CircleList() {
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  function handleJoin(name: string) {
    setJoined((prev) => ({ ...prev, [name]: true }));
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
            href="/circle-details"
            className="flex items-center gap-3 rounded-2xl bg-white p-2 cursor-pointer transition-all duration-200 active:scale-[0.98]"
          >
            <EmojiAvatar avatar={circle.avatar} size={52} shape="square" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-main-text truncate">{circle.name}</p>
              <p className="text-xs text-muted truncate">{circle.description}</p>
              <div className="flex items-center gap-1 mt-1">
                <HiOutlineUserGroup className="w-3.5 h-3.5 text-muted" />
                <span className="text-xs text-muted">{circle.members} members</span>
              </div>
            </div>
            {joined[circle.name] ? (
              <span className="shrink-0 rounded-full bg-gray-50 px-4 py-1.5 text-xs text-muted">
                Joined
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleJoin(circle.name);
                }}
                className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
              >
                Join
              </button>
            )}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
