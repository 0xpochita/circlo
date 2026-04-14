"use client";

import { HiChevronLeft, HiOutlineShare } from "react-icons/hi2";
import { useRouter } from "next/navigation";

type DetailsHeaderProps = {
  onShare?: () => void;
};

export default function DetailsHeader({ onShare }: DetailsHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between px-4 pt-14 pb-2">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push("/circles");
          }
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
      >
        <HiChevronLeft className="w-5 h-5 text-main-text" />
      </button>
      <p className="text-base font-semibold text-main-text">Circle Details</p>
      <button
        type="button"
        onClick={onShare}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
      >
        <HiOutlineShare className="w-5 h-5 text-main-text" />
      </button>
    </div>
  );
}
