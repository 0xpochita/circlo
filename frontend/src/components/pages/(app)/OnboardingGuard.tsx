"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

export default function OnboardingGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const completed = localStorage.getItem("circlo-onboarding-done");
    if (completed !== "true") {
      router.replace("/welcome");
      return;
    }
    setChecked(true);
  }, [router.replace]);

  useEffect(() => {
    if (!checked) return;
    if (!accessToken || !isAuthenticated) {
      localStorage.setItem("circlo-redirect-after-login", window.location.href);
      router.replace("/welcome");
    }
  }, [checked, accessToken, isAuthenticated, router.replace]);

  if (!checked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-main-bg">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
