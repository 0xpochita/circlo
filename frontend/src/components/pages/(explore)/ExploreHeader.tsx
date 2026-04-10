"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { HiXMark, HiEllipsisHorizontal } from "react-icons/hi2";

export default function ExploreHeader() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between px-4 pt-14 pb-2">
      <div className="flex items-center gap-3">
        <Image
          src="/Assets/Images/Avatar/avatar_ios.jpeg"
          alt="Profile"
          width={36}
          height={36}
          className="rounded-full object-cover"
        />
        <h1 className="text-base font-semibold text-main-text">Explore</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface cursor-pointer transition-all duration-200 active:scale-[0.95]"
        >
          <HiEllipsisHorizontal className="w-5 h-5 text-main-text" />
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface cursor-pointer transition-all duration-200 active:scale-[0.95]"
        >
          <HiXMark className="w-5 h-5 text-main-text" />
        </button>
      </div>
    </div>
  );
}
