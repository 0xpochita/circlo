"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiChevronDown, HiCheck } from "react-icons/hi2";
import { IoFitnessOutline, IoGameControllerOutline } from "react-icons/io5";
import type { ComponentType } from "react";

type Circle = {
  name: string;
  members: number;
} & ({ image: string; icon?: never } | { icon: ComponentType<{ className?: string }>; image?: never });

const circles: Circle[] = [
  { name: "Crypto Circle", members: 128, image: "/Assets/Images/Logo/logo-coin/celo-logo.svg" },
  { name: "Fitness Goals", members: 64, icon: IoFitnessOutline },
  { name: "Gaming Arena", members: 256, icon: IoGameControllerOutline },
];

export default function CircleSelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);

  const current = circles[selected];

  return (
    <div className="px-4 py-2">
      <p className="text-sm font-medium text-main-text mb-2">Select Circle</p>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-2xl bg-white p-4 cursor-pointer transition-all duration-200 active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
            {current.image ? (
              <Image src={current.image} alt={current.name} width={24} height={24} />
            ) : (
              current.icon && <current.icon className="w-5 h-5 text-brand" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-main-text">{current.name}</p>
            <p className="text-xs text-muted">{current.members} members</p>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <HiChevronDown className="w-5 h-5 text-muted" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl bg-white divide-y divide-gray-50">
              {circles.map((circle, i) => (
                <button
                  type="button"
                  key={circle.name}
                  onClick={() => { setSelected(i); setOpen(false); }}
                  className="flex w-full items-center justify-between px-4 py-3 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50">
                      {circle.image ? (
                        <Image src={circle.image} alt={circle.name} width={20} height={20} />
                      ) : (
                        circle.icon && <circle.icon className="w-4 h-4 text-brand" />
                      )}
                    </div>
                    <p className="text-sm text-main-text">{circle.name}</p>
                  </div>
                  {selected === i && <HiCheck className="w-5 h-5 text-brand" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
