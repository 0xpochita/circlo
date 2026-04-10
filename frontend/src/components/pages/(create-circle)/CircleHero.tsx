"use client";

import { motion } from "framer-motion";

const avatars = [
  { color: "#3B82F6", initials: "S", size: 52, x: 0, y: 0 },
  { color: "#F59E0B", initials: "A", size: 52, x: 56, y: -4 },
  { color: "#EC4899", initials: "G", size: 52, x: 112, y: 2 },
  { color: "#F59E0B", initials: "T", size: 48, x: 20, y: 48 },
  { color: "#22C55E", initials: "M", size: 48, x: 72, y: 50 },
];

export default function CircleHero() {
  return (
    <div className="flex flex-col items-center px-4 py-4">
      <div className="w-full rounded-2xl bg-surface py-8">
        <div className="relative mx-auto h-28 w-44">
          {avatars.map((av, i) => (
            <motion.div
              key={`avatar-${av.initials}-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring" as const,
                stiffness: 300,
                damping: 20,
                delay: 0.15 * i,
              }}
              className="absolute flex items-center justify-center rounded-full"
              style={{
                width: av.size,
                height: av.size,
                left: av.x,
                top: av.y,
                backgroundColor: `${av.color}20`,
              }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: av.size - 12,
                  height: av.size - 12,
                  backgroundColor: av.color,
                }}
              >
                <span className="text-sm font-bold text-white">{av.initials}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
