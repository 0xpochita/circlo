"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateCircleStore } from "@/stores/createCircleStore";

export default function ContinueButton() {
  const router = useRouter();
  const name = useCreateCircleStore((s) => s.name);

  function handleContinue() {
    if (!name.trim()) {
      toast("Please enter a circle name");
      return;
    }
    router.push("/create-circle/invite");
  }

  return (
    <div className="px-4 pb-10 pt-4 mt-auto">
      <motion.button
        type="button"
        onClick={handleContinue}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className={`w-full rounded-full py-4 text-base font-semibold cursor-pointer transition-all duration-200 active:scale-[0.97] ${
          name.trim() ? "bg-brand text-white" : "bg-gray-200 text-muted"
        }`}
      >
        Continue
      </motion.button>
    </div>
  );
}
