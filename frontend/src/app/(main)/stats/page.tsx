"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineChartBar,
  HiOutlineChevronLeft,
  HiOutlineTrophy,
} from "react-icons/hi2";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";
import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import { useMyCircles } from "@/hooks";
import { goalsApi, type GoalWithMyStake } from "@/lib/api/endpoints";
import { normalizeSide, toAvatar } from "@/lib/utils";
import { useDataCache } from "@/stores/dataCache";

type StakeOutcome = "active" | "won" | "lost" | "claimed";

function outcomeOf(goal: GoalWithMyStake): StakeOutcome {
  if (!goal.myStake) return "active";
  if (goal.myStake.claimed) return "claimed";
  if (goal.status === "resolved" || goal.status === "paidout") {
    const mySide = normalizeSide(goal.myStake.side);
    const winningSide = normalizeSide(goal.winningSide);
    if (mySide !== null && winningSide !== null && mySide === winningSide) {
      return "won";
    }
    return "lost";
  }
  return "active";
}

type CircleStats = {
  circleId: string;
  name: string;
  avatarEmoji: string | null;
  avatarColor: string | null;
  stakes: number;
  staked: number;
  won: number;
  lost: number;
  pnl: number;
};

export default function StatsPage() {
  const router = useRouter();
  const cachedGoals = useDataCache((s) => s.myGoals);
  const isStale = useDataCache((s) => s.isStale);
  const setMyGoals = useDataCache((s) => s.setMyGoals);
  const { circles, isLoading: circlesLoading } = useMyCircles();
  const [goals, setGoals] = useState<GoalWithMyStake[]>(cachedGoals);
  const [goalsLoading, setGoalsLoading] = useState(cachedGoals.length === 0);

  const isLoading = goalsLoading || circlesLoading;

  useEffect(() => {
    if (!isStale("myGoals") && cachedGoals.length > 0) {
      setGoals(cachedGoals);
      setGoalsLoading(false);
      return;
    }
    goalsApi
      .mine()
      .then((res) => {
        setGoals(res.items);
        setMyGoals(res.items);
      })
      .catch(() => {})
      .finally(() => setGoalsLoading(false));
  }, []);

  const staked = useMemo(
    () => goals.filter((g) => g.myStake !== null && g.myStake !== undefined),
    [goals],
  );

  const totals = useMemo(() => {
    let totalStaked = 0;
    let totalClaimed = 0;
    let won = 0;
    let lost = 0;
    let active = 0;

    for (const g of staked) {
      const o = outcomeOf(g);
      const s = parseFloat(g.myStake?.staked ?? "0");
      const c = parseFloat(g.myStake?.claimedAmount ?? "0");
      totalStaked += isNaN(s) ? 0 : s;
      totalClaimed += isNaN(c) ? 0 : c;
      if (o === "won" || o === "claimed") won++;
      else if (o === "lost") lost++;
      else active++;
    }

    const decided = won + lost;
    const winRate = decided > 0 ? (won / decided) * 100 : 0;
    const pnl = totalClaimed - totalStaked;

    return { totalStaked, totalClaimed, pnl, winRate, won, lost, active };
  }, [staked]);

  const perCircle = useMemo<CircleStats[]>(() => {
    const map = new Map<string, CircleStats>();
    for (const c of circles) {
      map.set(c.id, {
        circleId: c.id,
        name: c.name,
        avatarEmoji: c.avatarEmoji,
        avatarColor: c.avatarColor,
        stakes: 0,
        staked: 0,
        won: 0,
        lost: 0,
        pnl: 0,
      });
    }
    for (const g of staked) {
      const entry = map.get(g.circleId);
      if (!entry) continue;
      entry.stakes++;
      const s = parseFloat(g.myStake?.staked ?? "0");
      const c = parseFloat(g.myStake?.claimedAmount ?? "0");
      entry.staked += isNaN(s) ? 0 : s;
      entry.pnl += (isNaN(c) ? 0 : c) - (isNaN(s) ? 0 : s);
      const o = outcomeOf(g);
      if (o === "won" || o === "claimed") entry.won++;
      else if (o === "lost") entry.lost++;
    }
    return Array.from(map.values())
      .filter((x) => x.stakes > 0)
      .sort((a, b) => b.staked - a.staked);
  }, [circles, staked]);

  const bestStake = useMemo(() => {
    let best: { goal: GoalWithMyStake; pnl: number } | null = null;
    for (const g of staked) {
      const o = outcomeOf(g);
      if (o !== "claimed") continue;
      const s = parseFloat(g.myStake?.staked ?? "0");
      const c = parseFloat(g.myStake?.claimedAmount ?? "0");
      const pnl = (isNaN(c) ? 0 : c) - (isNaN(s) ? 0 : s);
      if (!best || pnl > best.pnl) best = { goal: g, pnl };
    }
    return best;
  }, [staked]);

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
        <p className="text-sm font-semibold text-main-text">My Stats</p>
        <div className="h-9 w-9" />
      </div>

      <PageTransition>
        <div className="px-4 py-2">
          <div className="rounded-3xl bg-linear-to-br from-gray-900 to-gray-800 p-5 text-white">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wide">
                  Win rate
                </p>
                <p className="mt-1 text-4xl font-bold">
                  {totals.winRate.toFixed(0)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60 uppercase tracking-wide">
                  Net PnL
                </p>
                <p
                  className={`mt-1 text-2xl font-bold inline-flex items-center gap-1 ${
                    totals.pnl >= 0 ? "text-emerald-400" : "text-red-300"
                  }`}
                >
                  {totals.pnl >= 0 ? "+" : ""}
                  {totals.pnl.toFixed(3)} <UsdtLabel size={14} />
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/5 py-3">
                <p className="text-xs text-white/60">Won</p>
                <p className="mt-0.5 text-lg font-bold text-emerald-400">
                  {totals.won}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 py-3">
                <p className="text-xs text-white/60">Lost</p>
                <p className="mt-0.5 text-lg font-bold text-red-300">
                  {totals.lost}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 py-3">
                <p className="text-xs text-white/60">Active</p>
                <p className="mt-0.5 text-lg font-bold text-blue-300">
                  {totals.active}
                </p>
              </div>
            </div>
          </div>
        </div>

        {bestStake && (
          <div className="px-4 py-2">
            <div className="rounded-2xl bg-emerald-50 p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <HiOutlineTrophy className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-emerald-600 font-medium">
                  Best stake
                </p>
                <p className="text-sm font-semibold text-main-text truncate">
                  {bestStake.goal.title}
                </p>
                <p className="text-xs text-emerald-600 inline-flex items-center gap-1">
                  +{bestStake.pnl.toFixed(4)} <UsdtLabel size={9} /> profit
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-2">
          <p className="px-2 pb-2 text-xs font-medium text-muted uppercase tracking-wide">
            By circle
          </p>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`csk-${i}`}
                  className="animate-pulse rounded-2xl bg-white p-4 h-20"
                />
              ))}
            </div>
          ) : perCircle.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
                <HiOutlineChartBar className="w-7 h-7 text-muted" />
              </div>
              <p className="text-base font-semibold text-main-text mb-1">
                No stake history yet
              </p>
              <p className="text-sm text-muted text-center max-w-xs">
                Stake on goals to see your circle-by-circle breakdown
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {perCircle.map((c, i) => {
                const decided = c.won + c.lost;
                const wr = decided > 0 ? (c.won / decided) * 100 : 0;
                return (
                  <motion.div
                    key={c.circleId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.04 * i }}
                  >
                    <Link
                      href={`/circle-details?id=${c.circleId}`}
                      className="flex items-center gap-3 rounded-2xl bg-white p-4 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                    >
                      <EmojiAvatar
                        avatar={toAvatar(c.avatarEmoji, c.avatarColor)}
                        size={40}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-main-text truncate">
                          {c.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                          <span>{c.stakes} stakes</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            {c.staked.toFixed(3)} <UsdtLabel size={9} />
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-main-text">
                          {wr.toFixed(0)}%
                        </p>
                        <p
                          className={`text-xs font-medium inline-flex items-center gap-1 ${
                            c.pnl >= 0 ? "text-emerald-500" : "text-red-400"
                          }`}
                        >
                          {c.pnl >= 0 ? "+" : ""}
                          {c.pnl.toFixed(3)} <UsdtLabel size={9} />
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 pt-2 pb-4">
          <Link
            href="/stake-history"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            <HiOutlineChartBar className="w-4 h-4" />
            View full stake history
          </Link>
        </div>
      </PageTransition>
      <BottomTabBar />
    </div>
  );
}
