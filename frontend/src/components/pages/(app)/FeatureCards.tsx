"use client";

import Link from "next/link";
import { HiOutlineUserGroup, HiOutlineGlobeAlt } from "react-icons/hi2";

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-2">
      <Link
        href="/circles"
        className="flex flex-col rounded-2xl bg-white p-2 cursor-pointer transition-all duration-200 active:scale-[0.97]"
      >
        <div className="flex aspect-4/5 flex-col justify-between rounded-2xl bg-gray-50 p-4">
          <HiOutlineUserGroup className="w-6 h-6 text-main-text" />
          <div>
            <p className="text-base font-semibold text-main-text">My Circles</p>
            <p className="text-xs text-muted">View and manage</p>
          </div>
        </div>
      </Link>
      <Link
        href="/explore"
        className="flex flex-col rounded-2xl bg-white p-2 cursor-pointer transition-all duration-200 active:scale-[0.97]"
      >
        <div className="flex aspect-4/5 flex-col justify-between rounded-2xl bg-gray-50 p-4">
          <HiOutlineGlobeAlt className="w-6 h-6 text-main-text" />
          <div>
            <p className="text-base font-semibold text-main-text">Explore</p>
            <p className="text-xs text-muted">Find new circles</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
