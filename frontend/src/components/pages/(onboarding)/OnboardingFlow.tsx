"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import WelcomeStep from "./WelcomeStep";
import ConnectStep from "./ConnectStep";
import ProfileStep from "./ProfileStep";
import { useAuthStore } from "@/stores/authStore";

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const completed = localStorage.getItem("circlo-onboarding-done");
    const hasRedirect = localStorage.getItem("circlo-redirect-after-login");
    if (completed === "true" && !hasRedirect) {
      router.replace("/");
    } else if (completed === "true" && hasRedirect) {
      setStep(1);
    }
  }, [router]);

  function handleComplete() {
    localStorage.setItem("circlo-onboarding-done", "true");
    const redirect = localStorage.getItem("circlo-redirect-after-login");
    if (redirect) {
      localStorage.removeItem("circlo-redirect-after-login");
      window.location.href = redirect;
    } else {
      router.replace("/");
    }
  }

  const hasProfile = useCallback(() => {
    if (!user) return false;
    const hasName = user.displayName && user.displayName !== "Player";
    const hasUsername = user.username && !user.username.startsWith("@");
    return !!(hasName || hasUsername);
  }, [user]);

  function handleConnectNext() {
    if (hasProfile()) {
      handleComplete();
    } else {
      setStep(2);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md bg-main-bg">

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
            <ConnectStep onNext={handleConnectNext} onBack={() => setStep(0)} />
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
