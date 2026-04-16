"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  BackHeader,
  CircleHero,
  MemberList,
  NextButton,
} from "@/components/pages/(create-circle)";

function InviteContent() {
  const searchParams = useSearchParams();
  const circleId = searchParams.get("id") ?? "";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg">
      <BackHeader />
      <div className="px-4 py-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-main-text">
          Invite your friends
        </h1>
        <p className="mt-1 text-sm text-muted">
          We&apos;ve listed few individuals based on your interest
        </p>
      </div>
      <CircleHero />
      <MemberList circleId={circleId} />
      <NextButton />
    </div>
  );
}

export default function InviteFriendsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center bg-main-bg">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
