"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HiOutlineTicket } from "react-icons/hi2";

export default function InviteCodeInput() {
  const [code, setCode] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setCode("");
  }

  return (
    <div className="px-4 py-2">
      <form onSubmit={handleJoin} className="rounded-2xl bg-white p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50">
            <HiOutlineTicket className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold text-main-text">Have an invite code?</p>
            <p className="text-xs text-muted mt-0.5">
              Paste it below to join a private circle
            </p>
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
