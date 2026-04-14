"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type WelcomeStepProps = {
  onNext: () => void;
};

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center justify-between min-h-dvh px-6 py-10">
      <div />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center"
      >
        <Image
          src="/Assets/Images/Logo/logo-brand/logo-brand.webp"
          alt="Circlo"
          width={80}
          height={80}
          className="rounded-2xl mb-6"
        />
        <h1 className="text-3xl font-bold tracking-tight text-main-text mb-3">
          Welcome to Circlo
        </h1>
        <p className="text-base text-muted max-w-xs leading-relaxed">
          Set goals with friends, stake small, and hold each other accountable — all on-chain.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="w-full flex flex-col gap-3"
      >
        <motion.button
          type="button"
          onClick={onNext}
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer"
        >
          Get Started
        </motion.button>
        <p className="text-xs text-muted text-center">
          Powered by Celo. Built for MiniPay.
        </p>
      </motion.div>
    </div>
  );
}
