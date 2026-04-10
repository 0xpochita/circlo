"use client";

import { motion } from "framer-motion";

export default function ConfirmButton() {
  return (
    <div className="px-4 pb-10 pt-4 mt-auto">
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer"
      >
        Confirm Prediction
      </motion.button>
    </div>
  );
}
