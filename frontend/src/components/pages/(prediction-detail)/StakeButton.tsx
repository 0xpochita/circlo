"use client";

import { motion } from "framer-motion";
import { UsdtLabel } from "@/components/shared";

export default function StakeButton() {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-main-bg px-4 pb-8 pt-4 mt-auto">
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-full bg-white px-4 py-3">
          <p className="text-[10px] text-muted uppercase tracking-wide">Your stake</p>
          <p className="text-sm font-bold text-main-text inline-flex items-center gap-1">
            0.50 <UsdtLabel size={12} />
          </p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          className="flex-1 rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer"
        >
          Place Stake
        </motion.button>
      </div>
    </div>
  );
}
