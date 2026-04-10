"use client";

import Link from "next/link";
import { HiOutlineUserGroup, HiOutlineGlobeAlt } from "react-icons/hi2";

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-2">
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 cursor-pointer transition-all duration-200 active:scale-[0.97]">
        <p className="text-base font-semibold text-main-text">My Circles</p>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light">
            <HiOutlineUserGroup className="w-5 h-5 text-brand" />
          </div>
          <p className="text-sm text-muted">View and manage</p>
        </div>
      </div>
      <Link
        href="/explore"
        className="flex flex-col gap-3 rounded-2xl bg-surface p-4 cursor-pointer transition-all duration-200 active:scale-[0.97]"
      >
        <p className="text-base font-semibold text-main-text">Explore</p>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light">
            <HiOutlineGlobeAlt className="w-5 h-5 text-brand" />
          </div>
          <p className="text-sm text-muted">Find new circles</p>
        </div>
      </Link>
    </div>
  );
}
