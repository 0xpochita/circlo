"use client";

import { HiXMark, HiOutlineTrophy } from "react-icons/hi2";
import { useState } from "react";

export default function Banner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-2">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50">
          <HiOutlineTrophy className="w-6 h-6 text-brand" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-main-text">
            Your first prediction is free!
          </p>
          <p className="text-sm font-semibold text-brand cursor-pointer">
            Start now
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="cursor-pointer"
        >
          <HiXMark className="w-5 h-5 text-muted" />
        </button>
      </div>
    </div>
  );
}
