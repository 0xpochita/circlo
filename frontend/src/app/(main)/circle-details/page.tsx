"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { DetailsHeader, DetailsHero, DetailsStats, DetailsGoals, DetailsMembers, JoinButton } from "@/components/pages/(circle-details)";
import { PageTransition } from "@/components/pages/(app)";
import { circlesApi } from "@/lib/api/endpoints";
import type { CircleDetailResponse } from "@/lib/api/endpoints";

function CircleDetailsContent() {
  const searchParams = useSearchParams();
  const circleId = searchParams.get("id") ?? "";
  const [circle, setCircle] = useState<CircleDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!circleId) {
      setIsLoading(false);
      return;
    }
    circlesApi
      .detail(circleId)
      .then((res) => setCircle(res))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [circleId]);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg">
      <DetailsHeader />
      <PageTransition>
        <DetailsHero circle={circle ?? undefined} />
        <DetailsStats circleId={circleId || undefined} circle={circle ?? undefined} />
        <DetailsGoals circleId={circleId || undefined} />
        <DetailsMembers circleId={circleId || undefined} />
      </PageTransition>
      <JoinButton circleId={circle?.chainId ? Number(circle.chainId) : 1} circleBackendId={circleId || undefined} />
    </div>
  );
}

export default function CircleDetailsPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    }>
      <CircleDetailsContent />
    </Suspense>
  );
}
