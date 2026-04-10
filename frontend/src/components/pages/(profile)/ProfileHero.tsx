"use client";

import Image from "next/image";
import { useState } from "react";
import { HiOutlineMagnifyingGlass, HiOutlineBell, HiOutlinePencil } from "react-icons/hi2";
import { useUserStore } from "@/stores/userStore";
import { EmojiAvatar, EmojiPicker } from "@/components/shared";

export default function ProfileHero() {
  const name = useUserStore((s) => s.name);
  const avatar = useUserStore((s) => s.avatar);
  const setAvatar = useUserStore((s) => s.setAvatar);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
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
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="relative cursor-pointer"
              >
                <EmojiAvatar avatar={avatar} size={44} />
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white">
                  <HiOutlinePencil className="w-3 h-3 text-main-text" />
                </div>
              </button>
              <p className="text-base font-semibold text-white">Hi, {name}</p>
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
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-white">12.50</p>
              <div className="flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-1 text-sm font-semibold text-white">
                USDT
                <Image
                  src="/Assets/Images/Logo/logo-coin/usdt-logo.svg"
                  alt="USDT"
                  width={16}
                  height={16}
                />
              </div>
            </div>
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

      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={avatar}
        onSave={setAvatar}
      />
    </>
  );
}
