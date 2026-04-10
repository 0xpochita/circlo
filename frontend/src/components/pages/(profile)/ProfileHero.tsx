"use client";

import Image from "next/image";
import { HiOutlineMagnifyingGlass, HiOutlineBell } from "react-icons/hi2";

export default function ProfileHero() {
  return (
    <div className="relative overflow-hidden rounded-b-3xl">
      <Image
        src="/Assets/Images/Background/bg-cloud.webp"
        alt="Background"
        width={448}
        height={320}
        className="absolute inset-0 h-full w-full object-cover"
        priority
      />
      <div className="relative z-10 px-4 pt-14 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Image
              src="/Assets/Images/Avatar/avatar_ios.jpeg"
              alt="Profile"
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
            <p className="text-base font-semibold text-white">Hi, Player</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md cursor-pointer transition-all duration-200 active:scale-[0.95]">
              <HiOutlineMagnifyingGlass className="w-5 h-5 text-white" />
            </button>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md cursor-pointer transition-all duration-200 active:scale-[0.95]">
              <HiOutlineBell className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-white/70">My Wallet</p>
          <p className="text-3xl font-bold text-white">12.50 <span className="text-lg font-medium">USDm</span></p>
          <p className="mt-1 text-sm font-medium text-emerald-300">+2.30 (22.5%)</p>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="flex-1 rounded-full bg-white py-3 text-sm font-semibold text-main-text cursor-pointer transition-all duration-200 active:scale-[0.97]">
            + Deposit
          </button>
          <button type="button" className="flex-1 rounded-full bg-white py-3 text-sm font-semibold text-main-text cursor-pointer transition-all duration-200 active:scale-[0.97]">
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}
