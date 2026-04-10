"use client";

import Link from "next/link";
import { HiOutlineUserGroup, HiOutlineGlobeAlt } from "react-icons/hi2";

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-2">
      <div className="flex flex-col rounded-2xl bg-white p-2 cursor-pointer transition-all duration-200 active:scale-[0.97]">
        <div className="flex h-24 items-start rounded-2xl bg-gray-50 p-4 mb-3">
          <HiOutlineUserGroup className="w-6 h-6 text-brand" />
        </div>
        <p className="text-base font-semibold text-main-text">My Circles</p>
        <p className="text-sm text-muted">View and manage</p>
      </div>
      <Link
        href="/explore"
        className="flex flex-col rounded-2xl bg-white p-2 cursor-pointer transition-all duration-200 active:scale-[0.97]"
      >
        <div className="flex h-24 items-start rounded-2xl bg-gray-50 p-4 mb-3">
          <HiOutlineGlobeAlt className="w-6 h-6 text-brand" />
        </div>
        <p className="text-base font-semibold text-main-text">Explore</p>
        <p className="text-sm text-muted">Find new circles</p>
      </Link>
    </div>
  );
}
