"use client";

import { useRouter } from "next/navigation";
import { HiXMark, HiEllipsisHorizontal } from "react-icons/hi2";
import { useUserStore } from "@/stores/userStore";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";

export default function ExploreHeader() {
  const router = useRouter();
  const avatar = useUserStore((s) => s.avatar);

  return (
    <div className="flex items-center justify-between px-4 pt-14 pb-2">
      <div className="flex items-center gap-3">
        <EmojiAvatar avatar={avatar} size={36} />
        <h1 className="text-base font-semibold text-main-text">Explore</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
        >
          <HiEllipsisHorizontal className="w-5 h-5 text-main-text" />
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
        >
          <HiXMark className="w-5 h-5 text-main-text" />
        </button>
      </div>
    </div>
  );
}
