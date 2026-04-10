"use client";

import Image from "next/image";
import Link from "next/link";
import { HiOutlinePlus } from "react-icons/hi2";

export default function CirclesHeader() {
  return (
    <div className="flex items-center justify-between px-4 pt-14 pb-2">
      <div className="flex items-center gap-3">
        <Image
          src="/Assets/Images/Avatar/avatar_ios.jpeg"
          alt="Profile"
          width={40}
          height={40}
          className="rounded-full object-cover"
        />
        <div>
          <p className="text-xs text-muted">Your</p>
          <h1 className="text-xl font-bold tracking-tight text-main-text">Circles</h1>
        </div>
      </div>
      <Link
        href="/create-circle"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-brand cursor-pointer transition-all duration-200 active:scale-[0.95]"
      >
        <HiOutlinePlus className="w-5 h-5 text-white" />
      </Link>
    </div>
  );
}
