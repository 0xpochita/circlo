"use client";

import Image from "next/image";
import { IoFitnessOutline, IoGameControllerOutline } from "react-icons/io5";
import type { ComponentType } from "react";

type CircleItem = {
  name: string;
  staked: string;
  change: string;
  positive: boolean;
} & ({ icon: ComponentType<{ className?: string }>; image?: never } | { image: string; icon?: never });

const circles: CircleItem[] = [
  {
    name: "Crypto",
    staked: "5.20 USDm",
    change: "+12.3%",
    positive: true,
    image: "/Assets/Images/Logo/logo-coin/btc-logo.svg",
  },
  {
    name: "Fitness",
    staked: "3.80 USDm",
    change: "-2.1%",
    positive: false,
    icon: IoFitnessOutline,
  },
  {
    name: "Gaming",
    staked: "3.50 USDm",
    change: "+5.7%",
    positive: true,
    icon: IoGameControllerOutline,
  },
];

export default function ActiveCircles() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Your circles</p>
        <button type="button" className="text-sm font-medium text-muted cursor-pointer">
          + New circle
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {circles.map((c) => (
          <div
            key={c.name}
            className="flex min-w-[160px] flex-col rounded-2xl bg-white p-1 cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            <div className="flex aspect-square flex-col justify-between rounded-2xl bg-gray-50 p-3">
              <div>
                {c.image ? (
                  <Image src={c.image} alt={c.name} width={28} height={28} />
                ) : (
                  c.icon && <c.icon className="w-6 h-6 text-brand" />
                )}
              </div>
              <p className="text-sm text-muted">{c.name}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-2">
              <p className="text-base font-bold text-main-text">{c.staked}</p>
              <p className={`text-xs font-medium ${c.positive ? "text-emerald-500" : "text-red-400"}`}>
                {c.change}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
