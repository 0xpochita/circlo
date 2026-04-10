"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HiOutlineSparkles } from "react-icons/hi2";
import { IoFitnessOutline, IoGameControllerOutline } from "react-icons/io5";
import {
  HiOutlineArrowTrendingUp,
  HiOutlineGlobeAlt,
  HiOutlineMusicalNote,
} from "react-icons/hi2";

const tabs = [
  { label: "All", icon: HiOutlineSparkles },
  { label: "Crypto", icon: HiOutlineArrowTrendingUp },
  { label: "Fitness", icon: IoFitnessOutline },
  { label: "Gaming", icon: IoGameControllerOutline },
  { label: "Global", icon: HiOutlineGlobeAlt },
  { label: "Music", icon: HiOutlineMusicalNote },
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
              : "bg-surface text-muted"
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
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
