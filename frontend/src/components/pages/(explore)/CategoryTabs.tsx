"use client";

import { motion } from "framer-motion";

const TAB_SPRING_STIFFNESS = 400;
const TAB_SPRING_DAMPING = 30;

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

export default function CategoryTabs({
  categories,
  selected,
  onSelect,
}: CategoryTabsProps) {
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
                transition={{
                  type: "spring" as const,
                  stiffness: TAB_SPRING_STIFFNESS,
                  damping: TAB_SPRING_DAMPING,
                }}
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
