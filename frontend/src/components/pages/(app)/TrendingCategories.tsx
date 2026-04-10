"use client";

import Image from "next/image";
import { IoFitnessOutline, IoGameControllerOutline } from "react-icons/io5";
import type { ComponentType } from "react";

type Category = {
  label: string;
} & ({ icon: ComponentType<{ className?: string }>; image?: never } | { image: string; icon?: never });

const categories: Category[] = [
  { image: "/Assets/Images/Logo/logo-coin/btc-logo.svg", label: "Crypto" },
  { icon: IoFitnessOutline, label: "Fitness" },
  { icon: IoGameControllerOutline, label: "Gaming" },
];

export default function TrendingCategories() {
  return (
    <div className="px-4 py-2">
      <p className="mb-3 text-sm font-medium text-muted">Trending</p>
      <div className="grid grid-cols-3 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.label}
            className="flex flex-col rounded-2xl bg-white p-1 cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            <div className="flex aspect-square flex-col justify-between rounded-2xl bg-gray-50 p-3">
              <div>
                {cat.image ? (
                  <Image src={cat.image} alt={cat.label} width={28} height={28} />
                ) : (
                  cat.icon && <cat.icon className="w-6 h-6 text-brand" />
                )}
              </div>
              <p className="text-sm font-medium text-main-text">{cat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
