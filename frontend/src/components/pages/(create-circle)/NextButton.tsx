"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function NextButton() {
  const router = useRouter();

  return (
    <div className="px-4 pb-10 pt-4 mt-auto">
      <motion.button
        type="button"
        onClick={() => router.push("/circle-success")}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="w-full rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer transition-all duration-200 active:scale-[0.97]"
      >
        Create Circle
      </motion.button>
    </div>
  );
}
