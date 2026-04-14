"use client";

import { motion } from "framer-motion";

type CategoryTab = {
  label: string;
  emoji: string;
  value: string;
};

type CategoryTabsProps = {
  categories: CategoryTab[];
  selected: string;
  onSelect: (value: string) => void;
};

export default function CategoryTabs({ categories, selected, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
      {categories.map((tab) => {
        const isActive = tab.value === selected;
        return (
          <button
            type="button"
            key={tab.label}
            onClick={() => onSelect(tab.value)}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-200 ${
              isActive ? "text-white" : "bg-gray-50 text-muted"
            }`}
          >
            {isActive && (
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
        );
      })}
    </div>
  );
}
