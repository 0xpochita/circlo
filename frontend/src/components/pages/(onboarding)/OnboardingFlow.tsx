"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import WelcomeStep from "./WelcomeStep";
import ConnectStep from "./ConnectStep";
import ProfileStep from "./ProfileStep";

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem("circlo-onboarding-done");
    if (completed === "true") {
      router.replace("/");
    }
  }, [router]);

  function handleComplete() {
    localStorage.setItem("circlo-onboarding-done", "true");
    router.replace("/");
  }

  return (
    <div className="mx-auto w-full max-w-md bg-main-bg">
      <div className="relative w-full">
        <div className="absolute top-4 left-6 right-6 z-10 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={`step-${i}`}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-brand" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <WelcomeStep onNext={() => setStep(1)} />
          </motion.div>
        )}
        {step === 1 && (
          <motion.div
            key="connect"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <ConnectStep onNext={() => setStep(2)} onBack={() => setStep(0)} />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <ProfileStep onNext={handleComplete} onBack={() => setStep(1)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
