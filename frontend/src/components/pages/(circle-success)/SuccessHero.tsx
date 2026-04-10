"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { HiCheck } from "react-icons/hi2";

const avatars = [
  { src: "/Assets/Images/Avatar/avatar-no-bg/avatar-1-no-bg.png", x: 0, y: 0, size: 80 },
  { src: "/Assets/Images/Avatar/avatar-no-bg/avatar-2-no-bg.png", x: 84, y: -8, size: 80 },
  { src: "/Assets/Images/Avatar/avatar-no-bg/avatar-3-no-bg.png", x: 168, y: 4, size: 80 },
  { src: "/Assets/Images/Avatar/avatar-no-bg/avatar-4-no-bg.png", x: 30, y: 72, size: 74 },
  { src: "/Assets/Images/Avatar/avatar-no-bg/avatar-7-no-bg.png", x: 112, y: 76, size: 100 },
];

export default function SuccessHero() {
  return (
    <div className="px-4 py-2">
      <div className="mb-4 flex items-center gap-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500"
        >
          <HiCheck className="w-4 h-4 text-white" />
        </motion.div>
        <p className="text-xs font-medium text-emerald-500 uppercase tracking-wide">Circle Created</p>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-main-text">Crypto Circle</h1>
        <p className="mt-1 text-sm text-muted">
          Your circle is ready. Invite more friends to grow your community.
        </p>
      </div>

      <div className="w-full rounded-2xl bg-white p-2">
        <div className="rounded-2xl bg-gray-50 py-10">
          <div className="relative mx-auto h-44 w-64">
            {avatars.map((av, i) => (
              <motion.div
                key={`avatar-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring" as const,
                  stiffness: 300,
                  damping: 20,
                  delay: 0.15 * i,
                }}
                className="absolute"
                style={{
                  width: av.size,
                  height: av.size,
                  left: av.x,
                  top: av.y,
                }}
              >
                <Image
                  src={av.src}
                  alt="Member"
                  width={av.size}
                  height={av.size}
                  className="h-full w-full object-contain"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
