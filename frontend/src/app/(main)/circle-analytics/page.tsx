"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  HiOutlineChartBar,
  HiOutlineChevronLeft,
  HiOutlineFire,
  HiOutlineTrophy,
  HiOutlineUsers,
} from "react-icons/hi2";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";
import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import {
  circlesApi,
  goalsApi,
  type CircleDetailResponse,
  type GoalResponse,
  type ParticipantResponse,
} from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";

type StakerStat = {
  userId: string;
  walletAddress: string;
  name: string | null;
  username: string | null;
  avatarEmoji: string | null;
  avatarColor: string | null;
  stakeCount: number;
  totalStaked: number;
  totalClaimed: number;
};

type GoalStat = {
  goal: GoalResponse;
  stakeCount: number;
  totalStaked: number;
};

type Analytics = {
  totalGoals: number;
  byStatus: Record<string, number>;
  totalStakes: number;
  totalVolume: number;
  totalClaimed: number;
  uniqueStakers: number;
  topStakers: StakerStat[];
  topGoals: GoalStat[];
  recentGoals: GoalResponse[];
};

function CircleAnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const circleId = searchParams.get("id") ?? "";
  const [circle, setCircle] = useState<CircleDetailResponse | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!circleId) {
      setIsLoading(false);
      setError(true);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const detail = await circlesApi.detail(circleId);
        if (cancelled) return;
        setCircle(detail);

        const goalsRes = await circlesApi.goals(circleId);
        if (cancelled) return;
        const goals = goalsRes.items;

        // Fetch participants for each goal (parallel batches of 5)
        const allParticipants: Array<{
          goalId: string;
          parts: ParticipantResponse[];
        }> = [];
        const BATCH = 5;
        for (let i = 0; i < goals.length; i += BATCH) {
          const batch = goals.slice(i, i + BATCH);
          const results = await Promise.all(
            batch.map(async (g) => {
              try {
                const r = await goalsApi.participants(g.id);
                return { goalId: g.id, parts: r.items };
              } catch {
                return { goalId: g.id, parts: [] };
              }
            }),
          );
          allParticipants.push(...results);
        }
        if (cancelled) return;

        // Aggregate
        const byStatus: Record<string, number> = {};
        let totalStakes = 0;
        let totalVolume = 0;
        let totalClaimed = 0;
        const stakerMap = new Map<string, StakerStat>();
        const goalStats: GoalStat[] = [];

        for (const g of goals) {
          byStatus[g.status] = (byStatus[g.status] ?? 0) + 1;
          const partsEntry = allParticipants.find((p) => p.goalId === g.id);
          const parts = partsEntry?.parts ?? [];
          const goalVolume = parts.reduce(
            (acc, p) => acc + parseFloat(p.staked || "0"),
            0,
          );
          goalStats.push({
            goal: g,
            stakeCount: parts.length,
            totalStaked: goalVolume,
          });
          totalStakes += parts.length;
          totalVolume += goalVolume;

          for (const p of parts) {
            const staked = parseFloat(p.staked || "0");
            const claimed = parseFloat(p.claimedAmount || "0");
            totalClaimed += claimed;
            const existing = stakerMap.get(p.userId);
            if (existing) {
              existing.stakeCount += 1;
              existing.totalStaked += staked;
              existing.totalClaimed += claimed;
            } else {
              stakerMap.set(p.userId, {
                userId: p.userId,
                walletAddress: p.user.walletAddress,
                name: p.user.name,
                username: p.user.username,
                avatarEmoji: p.user.avatarEmoji,
                avatarColor: p.user.avatarColor,
                stakeCount: 1,
                totalStaked: staked,
                totalClaimed: claimed,
              });
            }
          }
        }

        const topStakers = Array.from(stakerMap.values())
          .sort((a, b) => b.totalStaked - a.totalStaked)
          .slice(0, 5);

        const topGoals = [...goalStats]
          .sort((a, b) => b.stakeCount - a.stakeCount)
          .slice(0, 5);

        const recentGoals = [...goals]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 5);

        setAnalytics({
          totalGoals: goals.length,
          byStatus,
          totalStakes,
          totalVolume,
          totalClaimed,
          uniqueStakers: stakerMap.size,
          topStakers,
          topGoals,
          recentGoals,
        });
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [circleId]);

  const statusEntries = useMemo(() => {
    if (!analytics) return [];
    const statusOrder = ["open", "locked", "resolving", "resolved", "paidout", "disputed"];
    const entries = statusOrder
      .map((s) => ({ status: s, count: analytics.byStatus[s] ?? 0 }))
      .filter((e) => e.count > 0);
    const total = entries.reduce((acc, e) => acc + e.count, 0);
    return entries.map((e) => ({
      ...e,
      pct: total > 0 ? (e.count / total) * 100 : 0,
    }));
  }, [analytics]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-safe">
      <div className="flex items-center justify-between px-4 pt-safe pb-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-95"
        >
          <HiOutlineChevronLeft className="w-5 h-5 text-main-text" />
        </button>
        <p className="text-sm font-semibold text-main-text">Analytics</p>
        <div className="h-9 w-9" />
      </div>

      <PageTransition>
        {isLoading ? (
          <div className="px-4 py-2">
            <div className="rounded-3xl bg-white animate-pulse h-40" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`s-${i}`} className="rounded-2xl bg-white animate-pulse h-24" />
              ))}
            </div>
          </div>
        ) : error || !circle || !analytics ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white mb-4">
              <HiOutlineChartBar className="w-7 h-7 text-muted" />
            </div>
            <p className="text-base font-semibold text-main-text mb-1">
              Could not load analytics
            </p>
            <p className="text-sm text-muted">
              The circle may have been removed or has no on-chain activity yet.
            </p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2">
              <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
                <EmojiAvatar
                  avatar={toAvatar(circle.avatarEmoji, circle.avatarColor)}
                  size={48}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-main-text truncate">
                    {circle.name}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {circle.category} · {circle.privacy}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 py-2">
              <div className="rounded-3xl bg-linear-to-br from-gray-900 to-gray-800 p-5 text-white">
                <p className="text-xs text-white/60 uppercase tracking-wide">
                  Total volume
                </p>
                <p className="mt-1 text-3xl font-bold inline-flex items-center gap-2">
                  {analytics.totalVolume.toFixed(3)} <UsdtLabel size={20} />
                </p>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-white/5 py-3">
                    <p className="text-xs text-white/60">Goals</p>
                    <p className="mt-0.5 text-lg font-bold">
                      {analytics.totalGoals}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 py-3">
                    <p className="text-xs text-white/60">Stakes</p>
                    <p className="mt-0.5 text-lg font-bold">
                      {analytics.totalStakes}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 py-3">
                    <p className="text-xs text-white/60">Stakers</p>
                    <p className="mt-0.5 text-lg font-bold">
                      {analytics.uniqueStakers}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {statusEntries.length > 0 && (
              <div className="px-4 py-2">
                <p className="px-2 pb-2 text-xs font-medium text-muted uppercase tracking-wide">
                  Goal status
                </p>
                <div className="rounded-2xl bg-white p-4">
                  <div className="flex h-3 rounded-full overflow-hidden">
                    {statusEntries.map((e) => (
                      <div
                        key={e.status}
                        className={`${statusColor(e.status)}`}
                        style={{ width: `${e.pct}%` }}
                        title={`${e.status}: ${e.count}`}
                      />
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {statusEntries.map((e) => (
                      <div key={e.status} className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor(e.status)}`}
                        />
                        <span className="text-xs text-muted capitalize">
                          {e.status}
                        </span>
                        <span className="text-xs font-semibold text-main-text ml-auto">
                          {e.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {analytics.topStakers.length > 0 && (
              <div className="px-4 py-2">
                <p className="px-2 pb-2 text-xs font-medium text-muted uppercase tracking-wide flex items-center gap-1.5">
                  <HiOutlineTrophy className="w-3.5 h-3.5" />
                  Top stakers
                </p>
                <div className="flex flex-col gap-2">
                  {analytics.topStakers.map((s, i) => (
                    <motion.div
                      key={s.userId}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.04 * i }}
                      className="flex items-center gap-3 rounded-2xl bg-white p-3"
                    >
                      <div className="relative">
                        <EmojiAvatar
                          avatar={toAvatar(s.avatarEmoji, s.avatarColor)}
                          size={40}
                        />
                        <span
                          className={`absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            i === 0
                              ? "bg-amber-400"
                              : i === 1
                                ? "bg-gray-400"
                                : i === 2
                                  ? "bg-orange-400"
                                  : "bg-gray-300"
                          }`}
                        >
                          {i + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-main-text truncate">
                          {s.name ?? s.username ?? `${s.walletAddress.slice(0, 6)}...${s.walletAddress.slice(-4)}`}
                        </p>
                        <p className="text-xs text-muted">
                          {s.stakeCount} stake{s.stakeCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-main-text inline-flex items-center gap-1">
                          {s.totalStaked.toFixed(3)} <UsdtLabel size={10} />
                        </p>
                        {s.totalClaimed > 0 && (
                          <p className="text-xs text-emerald-500 inline-flex items-center gap-1">
                            +{s.totalClaimed.toFixed(3)} won
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {analytics.topGoals.length > 0 && (
              <div className="px-4 py-2">
                <p className="px-2 pb-2 text-xs font-medium text-muted uppercase tracking-wide flex items-center gap-1.5">
                  <HiOutlineFire className="w-3.5 h-3.5" />
                  Most engaged goals
                </p>
                <div className="flex flex-col gap-2">
                  {analytics.topGoals.map((gs, i) => (
                    <motion.div
                      key={gs.goal.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.04 * i }}
                      className="flex items-center gap-3 rounded-2xl bg-white p-3"
                    >
                      <EmojiAvatar
                        avatar={toAvatar(
                          gs.goal.avatarEmoji,
                          gs.goal.avatarColor,
                        )}
                        size={40}
                        shape="square"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-main-text truncate">
                          {gs.goal.title}
                        </p>
                        <p className="text-xs text-muted">
                          {gs.stakeCount} stake{gs.stakeCount !== 1 ? "s" : ""} ·{" "}
                          <span className="capitalize">{gs.goal.status}</span>
                        </p>
                      </div>
                      <p className="text-xs font-bold text-main-text inline-flex items-center gap-1 shrink-0">
                        {gs.totalStaked.toFixed(3)} <UsdtLabel size={9} />
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-2 mt-2">
              <div className="rounded-2xl bg-white p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
                  <HiOutlineUsers className="w-5 h-5 text-muted" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted">Active members in circle</p>
                  <p className="text-base font-bold text-main-text">
                    {circle.memberCount ?? circle.membersPreview?.length ?? 0}
                  </p>
                </div>
                <p className="text-xs text-muted">
                  {analytics.uniqueStakers > 0
                    ? `${Math.round((analytics.uniqueStakers / Math.max(circle.memberCount ?? circle.membersPreview?.length ?? 1, 1)) * 100)}% have staked`
                    : "—"}
                </p>
              </div>
            </div>
          </>
        )}
      </PageTransition>
      <BottomTabBar />
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "open":
      return "bg-blue-400";
    case "locked":
      return "bg-amber-400";
    case "resolving":
      return "bg-purple-400";
    case "resolved":
      return "bg-emerald-400";
    case "paidout":
      return "bg-emerald-500";
    case "disputed":
      return "bg-red-400";
    default:
      return "bg-gray-300";
  }
}

export default function CircleAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      }
    >
      <CircleAnalyticsContent />
    </Suspense>
  );
}
