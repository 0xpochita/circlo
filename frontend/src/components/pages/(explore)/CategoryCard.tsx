"use client";

import { motion } from "framer-motion";
import {
  HiOutlineArrowTrendingUp,
  HiOutlineBolt,
  HiOutlineTrophy,
  HiOutlineGlobeAlt,
  HiOutlineStar,
  HiOutlineSparkles,
  HiOutlineRocketLaunch,
  HiOutlineFire,
  HiOutlineCube,
  HiOutlineBeaker,
  HiOutlinePuzzlePiece,
  HiOutlineHandRaised,
} from "react-icons/hi2";

const icons = [
  HiOutlineBolt,
  HiOutlineCube,
  HiOutlineTrophy,
  HiOutlineSparkles,
  HiOutlineArrowTrendingUp,
  HiOutlineRocketLaunch,
  HiOutlineGlobeAlt,
  HiOutlineBeaker,
  HiOutlinePuzzlePiece,
  HiOutlineStar,
  HiOutlineFire,
  HiOutlineHandRaised,
];

const iconPositions = [
  { x: "15%", y: "8%", size: 32, rotate: -15 },
  { x: "45%", y: "5%", size: 28, rotate: 10 },
  { x: "72%", y: "10%", size: 34, rotate: -8 },
  { x: "8%", y: "28%", size: 36, rotate: 12 },
  { x: "38%", y: "22%", size: 40, rotate: -5 },
  { x: "68%", y: "25%", size: 30, rotate: 18 },
  { x: "20%", y: "48%", size: 34, rotate: -10 },
  { x: "50%", y: "42%", size: 32, rotate: 8 },
  { x: "75%", y: "45%", size: 28, rotate: -12 },
  { x: "12%", y: "65%", size: 30, rotate: 15 },
  { x: "42%", y: "62%", size: 36, rotate: -6 },
  { x: "70%", y: "68%", size: 32, rotate: 10 },
];

interface CategoryCardProps {
  title: string;
  difficulty: string;
  color: string;
}

export default function CategoryCard({ title, difficulty, color }: CategoryCardProps) {
  const lightColor = `${color}30`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-4 rounded-3xl p-6 pb-5 flex flex-col"
      style={{ backgroundColor: color }}
    >
      <div className="relative w-full h-72 mb-6">
        {icons.map((Icon, i) => {
          const pos = iconPositions[i];
          return (
            <motion.div
              key={`icon-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring" as const,
                stiffness: 260,
                damping: 20,
                delay: 0.1 + i * 0.05,
              }}
              className="absolute"
              style={{
                left: pos.x,
                top: pos.y,
              }}
            >
              <Icon
                style={{
                  width: pos.size,
                  height: pos.size,
                  color: lightColor,
                  transform: `rotate(${pos.rotate}deg)`,
                }}
              />
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-sm text-white/70">Difficulty:</span>
        <span className="flex items-center gap-1 text-sm font-semibold text-white">
          <HiOutlineSparkles className="w-4 h-4" />
          {difficulty}
        </span>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-full py-3.5 text-base font-semibold cursor-pointer"
        style={{ backgroundColor: lightColor, color: "white" }}
      >
        Let&apos;s go!
      </motion.button>
    </motion.div>
  );
}
