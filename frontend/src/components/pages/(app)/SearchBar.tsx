"use client";

import { HiOutlineMagnifyingGlass } from "react-icons/hi2";

export default function SearchBar() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 transition-all duration-200 focus-within:ring-2 focus-within:ring-brand">
        <HiOutlineMagnifyingGlass className="w-5 h-5 text-muted" />
        <input
          type="text"
          placeholder="Search circles or predictions"
          className="flex-1 bg-transparent text-base text-main-text placeholder:text-muted outline-none"
        />
      </div>
    </div>
  );
}
