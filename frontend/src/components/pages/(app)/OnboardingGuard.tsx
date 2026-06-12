"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

const LS_REDIRECT_AFTER_LOGIN = "circlo-redirect-after-login";

/**
 * Wait for zustand persist to rehydrate from localStorage before reading state.
 * Without this, first render sees default empty state → redirect → flicker loop.
 */
function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    return unsub;
  }, []);

  return hydrated;
}

export default function OnboardingGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (!hydrated) return;
    if (user?.username == null) {
      router.replace("/welcome");
      return;
    }
    setChecked(true);
  }, [hydrated, user?.username, router]);

  useEffect(() => {
    if (!checked) return;
    if (!accessToken || !isAuthenticated) {
      localStorage.setItem(LS_REDIRECT_AFTER_LOGIN, window.location.href);
      router.replace("/welcome");
    }
  }, [checked, accessToken, isAuthenticated, router]);

  if (!hydrated || !checked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-main-bg">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
