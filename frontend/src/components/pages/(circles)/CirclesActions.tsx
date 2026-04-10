"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { HiOutlineGlobeAlt, HiOutlineTicket } from "react-icons/hi2";

export default function CirclesActions() {
  const [code, setCode] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setCode("");
  }

  return (
    <div className="px-4 py-2 flex flex-col gap-3">
      <Link
        href="/explore"
        className="flex items-center justify-between rounded-2xl bg-white p-4 cursor-pointer transition-all duration-200 active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
            <HiOutlineGlobeAlt className="w-6 h-6 text-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold text-main-text">Explore Circles</p>
            <p className="text-xs text-muted">Find new circles to join</p>
          </div>
        </div>
        <motion.span
          whileTap={{ scale: 0.95 }}
          className="rounded-full bg-gray-50 px-4 py-1.5 text-xs font-medium text-main-text"
        >
          Browse
        </motion.span>
      </Link>

      <form
        onSubmit={handleJoin}
        className="rounded-2xl bg-white p-4"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50">
            <HiOutlineTicket className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold text-main-text">Join with invite code</p>
            <p className="text-xs text-muted mt-0.5">Got a code from a friend? Enter it here</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. CIRCLO-1234"
            className="flex-1 rounded-xl bg-gray-50 px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-brand"
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            disabled={!code.trim()}
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white cursor-pointer transition-all duration-200 disabled:bg-gray-100 disabled:text-muted disabled:cursor-not-allowed"
          >
            Join
          </motion.button>
        </div>
      </form>
    </div>
  );
}
