"use client";

import { motion } from "framer-motion";

export default function NextButton() {
  return (
    <div className="px-4 pb-10 pt-4 mt-auto">
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="w-full rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer transition-all duration-200 active:scale-[0.97]"
      >
        Next
      </motion.button>
    </div>
  );
}
