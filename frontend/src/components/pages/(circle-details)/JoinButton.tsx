"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HiCheck } from "react-icons/hi2";

export default function JoinButton() {
  const [joined, setJoined] = useState(false);

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-main-bg px-4 pb-8 pt-4 mt-auto">
      <motion.button
        type="button"
        onClick={() => setJoined(!joined)}
        whileTap={{ scale: 0.97 }}
        className={`flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-semibold cursor-pointer transition-all duration-200 ${
          joined ? "bg-gray-100 text-muted" : "bg-brand text-white"
        }`}
      >
        {joined && <HiCheck className="w-5 h-5" />}
        {joined ? "Joined" : "Join Circle"}
      </motion.button>
    </div>
  );
}
