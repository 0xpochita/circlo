"use client";

import { EmojiAvatar } from "@/components/shared";
import type { UserAvatar } from "@/types";

type Category = {
  label: string;
  avatar: UserAvatar;
};

const categories: Category[] = [
  { label: "Crypto", avatar: { emoji: "💎", color: "#60a5fa" } },
  { label: "Fitness", avatar: { emoji: "⚡", color: "#f87171" } },
  { label: "Gaming", avatar: { emoji: "🎮", color: "#a78bfa" } },
];

export default function TrendingCategories() {
  return (
    <div className="px-4 py-2">
      <p className="mb-3 text-sm font-medium text-muted">Trending</p>
      <div className="grid grid-cols-3 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.label}
            className="flex flex-col rounded-2xl bg-white p-2 cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            <div className="flex aspect-4/5 flex-col justify-between rounded-2xl bg-gray-50 p-4">
              <div>
                <EmojiAvatar avatar={cat.avatar} size={36} shape="square" />
              </div>
              <p className="text-base font-semibold text-main-text">{cat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
