"use client";

import Link from "next/link";
import { HiOutlinePlus } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared";
import { useUserStore } from "@/stores/userStore";

export default function CirclesHeader() {
  const avatar = useUserStore((s) => s.avatar);

  return (
    <div className="flex items-center justify-between px-4 pt-14 pb-2">
      <div className="flex items-center gap-3">
        <EmojiAvatar avatar={avatar} size={40} />
        <div>
          <p className="text-xs text-muted">Your</p>
          <h1 className="text-xl font-bold tracking-tight text-main-text">
            Circles
          </h1>
        </div>
      </div>
      <Link
        href="/create-circle"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
      >
        <HiOutlinePlus className="w-5 h-5 text-main-text" />
      </Link>
    </div>
  );
}
