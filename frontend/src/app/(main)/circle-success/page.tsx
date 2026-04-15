"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageTransition } from "@/components/pages/(app)";
import {
  ActionCard,
  CircleStats,
  MemberActivity,
  PredictionMarketList,
  SuccessHeader,
  SuccessHero,
} from "@/components/pages/(circle-success)";
import type { CircleDetailResponse } from "@/lib/api/endpoints";
import { circlesApi } from "@/lib/api/endpoints";

function CircleSuccessContent() {
  const searchParams = useSearchParams();
  const circleId = searchParams.get("id");
  const paramName = searchParams.get("name") ?? "";
  const paramEmoji = searchParams.get("emoji") ?? "";
  const paramColor = searchParams.get("color") ?? "";
  const paramDesc = searchParams.get("desc") ?? "";

  const [circle, setCircle] = useState<CircleDetailResponse | null>(null);

  useEffect(() => {
    if (!circleId) return;
    circlesApi
      .detail(circleId)
      .then((res) => setCircle(res))
      .catch(() => {});
  }, [circleId]);

  const fallbackCircle: CircleDetailResponse = {
    id: circleId ?? "",
    chainId: null,
    ownerId: "",
    name: paramName || "Your Circle",
    description: paramDesc || null,
    category: "general",
    privacy: "public",
    inviteCode: null,
    avatarEmoji: paramEmoji || null,
    avatarColor: paramColor || null,
    createdAt: new Date().toISOString(),
    membersPreview: [],
  };

  const displayCircle = circle ?? fallbackCircle;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-10">
      <SuccessHeader />
      <PageTransition>
        <SuccessHero circle={displayCircle} />
        <ActionCard />
        <CircleStats circleId={circleId ?? undefined} />
        <PredictionMarketList circleId={circleId ?? undefined} />
        <MemberActivity circleId={circleId ?? undefined} />
      </PageTransition>
    </div>
  );
}

export default function CircleSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      }
    >
      <CircleSuccessContent />
    </Suspense>
  );
}
