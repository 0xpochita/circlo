"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  HiOutlineUserGroup,
  HiOutlineGlobeAlt,
} from "react-icons/hi2";
import { IoFitnessOutline, IoGameControllerOutline, IoMusicalNotesOutline } from "react-icons/io5";
import { useState, type ComponentType } from "react";

type CircleItem = {
  name: string;
  members: number;
  description: string;
} & ({ icon: ComponentType<{ className?: string }>; image?: never } | { image: string; icon?: never });

const circles: CircleItem[] = [
  {
    name: "Crypto Predictions",
    members: 128,
    image: "/Assets/Images/Logo/logo-coin/btc-logo.svg",
    description: "Predict BTC, ETH & altcoin prices weekly",
  },
  {
    name: "Fitness Goals",
    members: 64,
    icon: IoFitnessOutline,
    description: "Challenge friends on workout streaks",
  },
  {
    name: "Gaming Arena",
    members: 256,
    icon: IoGameControllerOutline,
    description: "Predict match results & tournament winners",
  },
  {
    name: "World Events",
    members: 89,
    icon: HiOutlineGlobeAlt,
    description: "Predict news, elections & global trends",
  },
  {
    name: "Music Charts",
    members: 42,
    icon: IoMusicalNotesOutline,
    description: "Guess next #1 hits & award winners",
  },
];

export default function CircleList() {
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  function handleJoin(name: string) {
    setJoined((prev) => ({ ...prev, [name]: true }));
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      {circles.map((circle, i) => (
        <motion.div
          key={circle.name}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 * i }}
          className="flex items-center gap-3 rounded-2xl bg-surface p-4"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-light">
            {circle.image ? (
              <Image src={circle.image} alt={circle.name} width={28} height={28} />
            ) : (
              circle.icon && <circle.icon className="w-6 h-6 text-brand" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-main-text truncate">{circle.name}</p>
            <p className="text-xs text-muted truncate">{circle.description}</p>
            <div className="flex items-center gap-1 mt-1">
              <HiOutlineUserGroup className="w-3.5 h-3.5 text-muted" />
              <span className="text-xs text-muted">{circle.members} members</span>
            </div>
          </div>
          {joined[circle.name] ? (
            <span className="shrink-0 rounded-full bg-brand-light px-4 py-1.5 text-xs text-muted">
              Joined
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handleJoin(circle.name)}
              className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
            >
              Join
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
