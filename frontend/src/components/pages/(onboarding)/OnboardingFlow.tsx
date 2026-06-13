"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usersApi } from "@/lib/api/endpoints";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import ConnectStep from "./ConnectStep";
import ProfileStep from "./ProfileStep";
import WelcomeStep from "./WelcomeStep";

const LS_ONBOARDING_DONE = LS_ONBOARDING_DONE;
const LS_REDIRECT_AFTER_LOGIN = LS_REDIRECT_AFTER_LOGIN;
const STEP_TRANSITION_DURATION = 0.3;

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(LS_ONBOARDING_DONE);
    const hasRedirect = localStorage.getItem(LS_REDIRECT_AFTER_LOGIN);

    // Don't redirect to "/" unless user is actually authenticated — otherwise
    // OnboardingGuard will bounce them right back here, causing a flicker loop.
    const isAuthed = useAuthStore.persist.hasHydrated()
      ? useAuthStore.getState().isAuthenticated
      : false;

    if (completed === "true" && !hasRedirect && isAuthed) {
      router.replace("/");
    } else if (completed === "true" && hasRedirect) {
      setStep(1);
    } else if (completed === "true" && !isAuthed) {
      // Onboarding flag stale — auth got cleared. Send to connect step to re-auth.
      setStep(1);
    }
  }, [router]);

  function handleComplete() {
    localStorage.setItem(LS_ONBOARDING_DONE, "true");
    const redirect = localStorage.getItem(LS_REDIRECT_AFTER_LOGIN);
    if (redirect) {
      localStorage.removeItem(LS_REDIRECT_AFTER_LOGIN);
      window.location.href = redirect;
    } else {
      router.replace("/");
    }
  }

  async function handleConnectNext() {
    try {
      const me = await usersApi.me();

      useUserStore.getState().setName(me.name ?? "");
      useUserStore.getState().setUsername(me.username ?? "");
      if (me.avatarEmoji && me.avatarColor) {
        useUserStore.getState().setAvatar({
          emoji: me.avatarEmoji,
          color: me.avatarColor,
        });
      }

      if (me.username) {
        handleComplete();
        return;
      }
      setStep(2);
    } catch {
      toast.error("Couldn't load your profile. Please try again.");
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
            transition={{ duration: STEP_TRANSITION_DURATION }}
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
            transition={{ duration: STEP_TRANSITION_DURATION }}
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
            transition={{ duration: STEP_TRANSITION_DURATION }}
          >
            <ProfileStep onNext={handleComplete} onBack={() => setStep(1)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
