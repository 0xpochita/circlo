"use client";

import { motion } from "framer-motion";
import Image from "next/image";

type WelcomeStepProps = {
  onNext: () => void;
};

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <div className="flex-1 flex flex-col items-center px-6 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl font-bold tracking-tight text-main-text">
            Your goals,
          </h1>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-500">
            on-chain
          </h1>
          <p className="mt-3 text-xs text-gray-400 uppercase tracking-[0.2em]">
            Stake, predict, and win together
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="w-full rounded-3xl bg-white overflow-hidden"
        >
          <div className="flex flex-col items-center py-20 px-6 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 rounded-full bg-emerald-50/60" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full bg-emerald-100/40" />
            </div>

            <div className="relative z-10 mb-4">
              <Image
                src="/Assets/Images/Logo/logo-brand/logo-brand.webp"
                alt="Circlo"
                width={72}
                height={72}
                className="rounded-2xl"
              />
            </div>

            <div className="relative z-10 mb-8">
              <p className="text-sm font-medium text-emerald-500">
                Just 1 minute
              </p>
            </div>

            <p className="relative z-10 text-sm text-gray-400 text-center max-w-70 leading-relaxed">
              Set goals with friends, stake small amounts, and hold each other
              accountable — all transparent on the Celo blockchain.
            </p>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="px-6 pb-8 pt-6"
      >
        <motion.button
          type="button"
          onClick={onNext}
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-full bg-gray-900 py-4 text-base font-semibold text-white cursor-pointer"
        >
          Continue
        </motion.button>
        <p className="text-xs text-gray-400 text-center mt-3">
          Powered by Celo
        </p>
      </motion.div>
    </div>
  );
}
