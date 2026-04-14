"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem("circlo-onboarding-done");
    if (completed !== "true") {
      router.replace("/welcome");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-main-bg">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
