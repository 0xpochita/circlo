"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { TbTargetArrow } from "react-icons/tb";
import { PageTransition } from "@/components/pages/(app)";
import {
  DetailsGoals,
  DetailsHeader,
  DetailsHero,
  DetailsMembers,
  InviteMemberButton,
  DetailsStats,
  JoinButton,
} from "@/components/pages/(circle-details)";
import { ShareSheet } from "@/components/shared";
import type { CircleDetailResponse } from "@/lib/api/endpoints";
import { circlesApi } from "@/lib/api/endpoints";
import { useAuthStore } from "@/stores/authStore";

function CircleDetailsContent() {
  const searchParams = useSearchParams();
  const circleId = searchParams.get("id") ?? "";
  const [circle, setCircle] = useState<CircleDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);

  const isMember = useMemo(() => {
    if (!circle || !userId) return false;
    if (circle.ownerId === userId) return true;
    return circle.membersPreview?.some((m) => m.userId === userId) ?? false;
  }, [circle, userId]);

  useEffect(() => {
    if (!circleId) {
      setIsLoading(false);
      return;
    }
    circlesApi
      .detail(circleId)
      .then((res) => setCircle(res))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [circleId]);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg">
        <div className="flex items-center justify-between px-4 pt-14 pb-2">
          <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-4 w-24 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse" />
        </div>
        <div className="px-4 py-2 animate-pulse">
          <div className="flex gap-2 mb-3">
            <div className="h-5 w-16 rounded-md bg-gray-100" />
            <div className="h-5 w-16 rounded-md bg-gray-100" />
          </div>
          <div className="h-7 w-48 rounded-lg bg-gray-100 mb-2" />
          <div className="h-4 w-64 rounded-lg bg-gray-100 mb-4" />
          <div className="rounded-2xl bg-white p-2">
            <div className="rounded-2xl bg-gray-50 h-48" />
          </div>
        </div>
        <div className="px-4 py-2 animate-pulse">
          <div className="flex rounded-2xl bg-white p-4 gap-4">
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="h-6 w-8 rounded-lg bg-gray-100" />
              <div className="h-3 w-14 rounded-lg bg-gray-100" />
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="h-6 w-8 rounded-lg bg-gray-100" />
              <div className="h-3 w-16 rounded-lg bg-gray-100" />
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="h-6 w-12 rounded-lg bg-gray-100" />
              <div className="h-3 w-16 rounded-lg bg-gray-100" />
            </div>
          </div>
        </div>
        <div className="px-4 py-2 animate-pulse">
          <div className="h-5 w-24 rounded-lg bg-gray-100 mb-3" />
          <div className="rounded-2xl bg-white p-4 h-24" />
        </div>
        <div className="px-4 py-2 animate-pulse">
          <div className="h-5 w-20 rounded-lg bg-gray-100 mb-3" />
          <div className="rounded-2xl bg-white divide-y divide-gray-50">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`mskel-${i}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="h-10 w-10 rounded-full bg-gray-100" />
                <div className="flex-1">
                  <div className="h-4 w-28 rounded-lg bg-gray-100 mb-1" />
                  <div className="h-3 w-20 rounded-lg bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || (!circle && !isLoading)) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg items-center justify-center gap-3 px-4">
        <p className="text-base font-semibold text-main-text">
          Circle not found
        </p>
        <p className="text-sm text-muted text-center">
          This circle may have been removed or the link is invalid.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg">
      <DetailsHeader onShare={() => setShareOpen(true)} />
      <PageTransition>
        <DetailsHero circle={circle ?? undefined} />
        <DetailsStats
          circleId={circleId || undefined}
          circle={circle ?? undefined}
        />
        {isMember && (
          <>
            <div className="px-4 py-2">
              <Link
                href={`/create-prediction?circleId=${circleId}`}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer transition-all duration-200 active:scale-[0.97]"
              >
                <TbTargetArrow className="w-5 h-5" />
                Create Goal
              </Link>
            </div>
            <InviteMemberButton circleId={circleId || undefined} />
          </>
        )}
        <DetailsGoals circleId={circleId || undefined} />
        <DetailsMembers circleId={circleId || undefined} />
      </PageTransition>
      {!isMember && (
        <JoinButton
          circleId={circle?.chainId ? Number(circle.chainId) : 1}
          circleBackendId={circleId || undefined}
        />
      )}
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        circleName={circle?.name ?? "Circle"}
        circleId={circleId}
        inviteCode={circle?.inviteCode}
        avatarEmoji={circle?.avatarEmoji}
        avatarColor={circle?.avatarColor}
      />
    </div>
  );
}

export default function CircleDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      }
    >
      <CircleDetailsContent />
    </Suspense>
  );
}
