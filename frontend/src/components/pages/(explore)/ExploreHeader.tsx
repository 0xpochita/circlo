"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  HiCheck,
  HiEllipsisHorizontal,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineClock,
  HiOutlineLanguage,
  HiOutlineUserGroup,
  HiXMark,
} from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared";
import { useSheetOverflow } from "@/hooks";
import { useUserStore } from "@/stores/userStore";

export type ExploreSortKey = "newest" | "members" | "alphabetical";

type ExploreHeaderProps = {
  sortBy: ExploreSortKey;
  onSortChange: (key: ExploreSortKey) => void;
};

const SORT_OPTIONS: {
  key: ExploreSortKey;
  label: string;
  description: string;
  icon: typeof HiOutlineClock;
}[] = [
  {
    key: "newest",
    label: "Newest first",
    description: "Recently created circles",
    icon: HiOutlineClock,
  },
  {
    key: "members",
    label: "Most members",
    description: "Largest communities first",
    icon: HiOutlineUserGroup,
  },
  {
    key: "alphabetical",
    label: "Alphabetical",
    description: "Name A to Z",
    icon: HiOutlineLanguage,
  },
];

export default function ExploreHeader({
  sortBy,
  onSortChange,
}: ExploreHeaderProps) {
  const router = useRouter();
  const avatar = useUserStore((s) => s.avatar);
  const [filterOpen, setFilterOpen] = useState(false);

  useSheetOverflow(filterOpen);

  function handleSelect(key: ExploreSortKey) {
    onSortChange(key);
    setFilterOpen(false);
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-14 pb-2">
        <div className="flex items-center gap-3">
          <EmojiAvatar avatar={avatar} size={36} />
          <h1 className="text-base font-semibold text-main-text">Explore</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
          >
            <HiEllipsisHorizontal className="w-5 h-5 text-main-text" />
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
          >
            <HiXMark className="w-5 h-5 text-main-text" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {filterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterOpen(false)}
              className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring" as const,
                stiffness: 300,
                damping: 32,
              }}
              className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 rounded-t-3xl bg-white"
            >
              <div className="flex items-start justify-between px-6 pt-6 pb-3">
                <div className="flex items-center gap-2">
                  <HiOutlineAdjustmentsHorizontal className="w-5 h-5 text-main-text" />
                  <div>
                    <h2 className="text-xl font-bold text-main-text">Filter</h2>
                    <p className="mt-0.5 text-xs text-muted">
                      Choose how circles are sorted
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-95"
                >
                  <HiXMark className="w-5 h-5 text-main-text" />
                </button>
              </div>

              <div className="px-4 pb-8">
                <p className="px-2 mb-2 text-[10px] font-semibold text-muted uppercase tracking-wider">
                  Sort by
                </p>
                <div className="rounded-2xl bg-gray-50 divide-y divide-gray-100">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = sortBy === opt.key;
                    return (
                      <button
                        type="button"
                        key={opt.key}
                        onClick={() => handleSelect(opt.key)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-200 active:bg-gray-100"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                            isSelected ? "bg-emerald-500" : "bg-white"
                          }`}
                        >
                          <opt.icon
                            className={`w-4 h-4 ${
                              isSelected ? "text-white" : "text-main-text"
                            }`}
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-main-text">
                            {opt.label}
                          </p>
                          <p className="text-xs text-muted">
                            {opt.description}
                          </p>
                        </div>
                        {isSelected && (
                          <HiCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
