"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { HiXMark } from "react-icons/hi2";

const LOGO_SIZE = 32;

export default function SuccessHeader() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between px-4 pt-14 pb-2">
      <div className="flex items-center gap-2">
        <Image
          src="/Assets/Images/Logo/logo-brand/logo-brand.webp"
          alt="Circlo Logo"
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          className="rounded-lg"
        />
        <p className="text-xl font-bold tracking-tight text-main-text">
          Circlo
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.push("/circles")}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
      >
        <HiXMark className="w-5 h-5 text-main-text" />
      </button>
    </div>
  );
}
