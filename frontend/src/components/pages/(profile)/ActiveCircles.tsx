"use client";

import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import type { UserAvatar } from "@/types";

type CircleItem = {
  name: string;
  staked: string;
  change: string;
  positive: boolean;
  avatar: UserAvatar;
};

const circles: CircleItem[] = [
  {
    name: "Crypto",
    staked: "5.20",
    change: "+12.3%",
    positive: true,
    avatar: { emoji: "💎", color: "#60a5fa" },
  },
  {
    name: "Fitness",
    staked: "3.80",
    change: "-2.1%",
    positive: false,
    avatar: { emoji: "⚡", color: "#f87171" },
  },
  {
    name: "Gaming",
    staked: "3.50",
    change: "+5.7%",
    positive: true,
    avatar: { emoji: "🎮", color: "#a78bfa" },
  },
];

export default function ActiveCircles() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Your circles</p>
        <button type="button" className="text-sm font-medium text-muted cursor-pointer">
          + New circle
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {circles.map((c) => (
          <div
            key={c.name}
            className="flex min-w-[160px] flex-col rounded-2xl bg-white p-1 cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            <div className="flex aspect-square flex-col justify-between rounded-2xl bg-gray-50 p-3">
              <div>
                <EmojiAvatar avatar={c.avatar} size={40} shape="square" />
              </div>
              <p className="text-sm text-muted">{c.name}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-2">
              <p className="text-base font-bold text-main-text inline-flex items-center gap-1">
                {c.staked} <UsdtLabel size={12} />
              </p>
              <p className={`text-xs font-medium ${c.positive ? "text-emerald-500" : "text-red-400"}`}>
                {c.change}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
