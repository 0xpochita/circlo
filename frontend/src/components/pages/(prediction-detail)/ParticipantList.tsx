"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const participants = [
  { name: "Sandra Flavor", avatar: "/Assets/Images/Avatar/avatar-2.jpeg", stake: "0.50 USDm", side: "Yes" },
  { name: "Andero Salem", avatar: "/Assets/Images/Avatar/avatar-3.jpeg", stake: "1.00 USDm", side: "No" },
  { name: "Greg Maxwell", avatar: "/Assets/Images/Avatar/avatar-4.jpeg", stake: "0.25 USDm", side: "Yes" },
  { name: "Tommy Sydney", avatar: "/Assets/Images/Avatar/avatar-5.jpeg", stake: "0.75 USDm", side: "Yes" },
];

export default function ParticipantList() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Participants</p>
        <span className="text-xs text-muted">{participants.length} joined</span>
      </div>
      <div className="rounded-2xl bg-white divide-y divide-gray-50">
        {participants.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Image
                src={p.avatar}
                alt={p.name}
                width={36}
                height={36}
                className="rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-main-text">{p.name}</p>
                <p className="text-xs text-muted">Staked {p.stake}</p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                p.side === "Yes"
                  ? "bg-emerald-50 text-emerald-500"
                  : "bg-red-50 text-red-400"
              }`}
            >
              {p.side}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
