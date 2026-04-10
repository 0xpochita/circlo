"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const tabs = [
  { label: "All", emoji: "✨" },
  { label: "Crypto", emoji: "💎" },
  { label: "Fitness", emoji: "⚡" },
  { label: "Gaming", emoji: "🎮" },
  { label: "Global", emoji: "🌈" },
  { label: "Music", emoji: "🎧" },
];

export default function CategoryTabs() {
  const [active, setActive] = useState(0);

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
      {tabs.map((tab, i) => (
        <button
          type="button"
          key={tab.label}
          onClick={() => setActive(i)}
          className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-200 ${
            active === i
              ? "text-white"
              : "bg-gray-50 text-muted"
          }`}
        >
          {active === i && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 rounded-full bg-brand"
              transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <span className="text-base leading-none">{tab.emoji}</span>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
