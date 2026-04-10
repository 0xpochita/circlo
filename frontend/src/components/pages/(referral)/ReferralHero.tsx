"use client";

import { motion } from "framer-motion";
import { UsdtLabel } from "@/components/shared";

const gridCells: { highlight?: "soft" | "active"; initials?: string }[] = [
  { highlight: "soft" }, {}, { highlight: "soft" }, {}, {}, { highlight: "soft" }, {},
  {}, { highlight: "soft" }, {}, { highlight: "active", initials: "FM" }, { highlight: "soft" }, {}, {},
  {}, {}, {}, {}, { highlight: "soft" }, {}, { highlight: "soft" },
];

export default function ReferralHero() {
  return (
    <div className="px-4 py-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-main-text">Referral Bonus</h1>
        <p className="mt-1 text-sm text-muted inline-flex items-center gap-1 flex-wrap">
          Invite your friends and earn 1 <UsdtLabel size={12} /> each when they sign up.
        </p>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {gridCells.map((cell, i) => (
          <motion.div
            key={`cell-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.02 * i,
              type: "spring" as const,
              stiffness: 300,
              damping: 25,
            }}
            className={`aspect-square rounded-xl flex items-center justify-center ${
              cell.highlight === "active"
                ? "bg-main-text"
                : cell.highlight === "soft"
                ? "bg-gray-100"
                : "bg-white"
            }`}
          >
            {cell.initials && (
              <span className="text-xs font-bold text-white">{cell.initials}</span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
