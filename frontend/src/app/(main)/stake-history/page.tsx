"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HiOutlineChartBar, HiOutlineChevronLeft } from "react-icons/hi2";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";
import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import { type GoalWithMyStake, goalsApi } from "@/lib/api/endpoints";
import { normalizeSide, toAvatar } from "@/lib/utils";
import { useDataCache } from "@/stores/dataCache";

const STAKE_DISPLAY_DECIMALS = 4;
const SKELETON_COUNT = 5;

type StakeStatus = "active" | "won" | "lost" | "claimed";
type FilterTab = "all" | StakeStatus;

function getStakeStatus(goal: GoalWithMyStake): StakeStatus {
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

const STATUS_BADGE_COLORS: Record<StakeStatus, string> = {
  active: "bg-blue-50 text-blue-500",
  won: "bg-emerald-50 text-emerald-500",
  lost: "bg-red-50 text-red-400",
  claimed: "bg-emerald-50 text-emerald-500",
};

function statusBadgeColor(status: StakeStatus): string {
  return STATUS_BADGE_COLORS[status];
}

function statusLabel(status: StakeStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function sideLabel(side: string | number | undefined): string {
  const s = normalizeSide(side);
  if (s === 0) return "YES";
  if (s === 1) return "NO";
  return "—";
}

export default function StakeHistoryPage() {
  const router = useRouter();
  const cached = useDataCache((s) => s.myGoals);
  const isStale = useDataCache((s) => s.isStale);
  const setMyGoals = useDataCache((s) => s.setMyGoals);
  const hasCached = cached.length > 0;
  const [goals, setGoals] = useState<GoalWithMyStake[]>(cached);
  const [isLoading, setIsLoading] = useState(!hasCached);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    if (!isStale("myGoals") && hasCached) {
      setGoals(cached);
      return;
    }
    goalsApi
      .mine()
      .then((res) => {
        setGoals(res.items);
        setMyGoals(res.items);
      })
      .catch(() => {
        if (!hasCached) setGoals([]);
      })
      .finally(() => setIsLoading(false));
  }, [cached, hasCached, isStale, setMyGoals]);

  const staked = useMemo(
    () => goals.filter((g) => g.myStake !== null && g.myStake !== undefined),
    [goals],
  );

  const stats = useMemo(() => {
    let totalStaked = 0;
    let totalClaimed = 0;
    let won = 0;
    let lost = 0;
    let active = 0;

    for (const g of staked) {
      const s = getStakeStatus(g);
      const stakedAmt = parseFloat(g.myStake?.staked ?? "0");
      const claimedAmt = parseFloat(g.myStake?.claimedAmount ?? "0");
      totalStaked += Number.isNaN(stakedAmt) ? 0 : stakedAmt;
      totalClaimed += Number.isNaN(claimedAmt) ? 0 : claimedAmt;
      if (s === "won" || s === "claimed") won++;
      else if (s === "lost") lost++;
      else active++;
    }

    const decided = won + lost;
    const winRate = decided > 0 ? Math.round((won / decided) * 100) : 0;
    const pnl = totalClaimed - totalStaked;

    return {
      totalStakes: staked.length,
      totalStaked: totalStaked.toFixed(STAKE_DISPLAY_DECIMALS),
      totalClaimed: totalClaimed.toFixed(STAKE_DISPLAY_DECIMALS),
      pnl: pnl.toFixed(STAKE_DISPLAY_DECIMALS),
      pnlPositive: pnl >= 0,
      winRate,
      counts: { active, won, lost },
    };
  }, [staked]);

  const filtered = useMemo(() => {
    if (filter === "all") return staked;
    return staked.filter((g) => {
      const s = getStakeStatus(g);
      if (filter === "won") return s === "won" || s === "claimed";
      return s === filter;
    });
  }, [staked, filter]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [filtered]);

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: staked.length },
    { id: "active", label: "Active", count: stats.counts.active },
    { id: "won", label: "Won", count: stats.counts.won },
    { id: "lost", label: "Lost", count: stats.counts.lost },
  ];

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
        <p className="text-sm font-semibold text-main-text">Stake History</p>
        <div className="h-9 w-9" />
      </div>

      <PageTransition>
        <div className="px-4 py-2">
          <div className="rounded-3xl bg-gray-900 p-5 text-white">
            <p className="text-xs text-white/60 uppercase tracking-wide">
              Total Staked
            </p>
            <p className="mt-1 text-3xl font-bold inline-flex items-center gap-2">
              {stats.totalStaked} <UsdtLabel size={20} />
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/60">Stakes</p>
                <p className="mt-0.5 text-xl font-bold">{stats.totalStakes}</p>
              </div>
              <div>
                <p className="text-xs text-white/60">Win rate</p>
                <p className="mt-0.5 text-xl font-bold">{stats.winRate}%</p>
              </div>
              <div>
                <p className="text-xs text-white/60">Won + Claimed</p>
                <p className="mt-0.5 text-xl font-bold inline-flex items-center gap-1">
                  {stats.totalClaimed} <UsdtLabel size={14} />
                </p>
              </div>
              <div>
                <p className="text-xs text-white/60">Net PnL</p>
                <p
                  className={`mt-0.5 text-xl font-bold inline-flex items-center gap-1 ${
                    stats.pnlPositive ? "text-emerald-400" : "text-red-300"
                  }`}
                >
                  {stats.pnlPositive ? "+" : ""}
                  {stats.pnl} <UsdtLabel size={14} />
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-2 sticky top-0 bg-main-bg z-10">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium cursor-pointer transition-all duration-200 ${
                  filter === t.id
                    ? "bg-gray-900 text-white"
                    : "bg-white text-muted"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className={`ml-1.5 ${
                      filter === t.id ? "text-white/70" : "text-muted/60"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-2 pb-4">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <div
                  key={`skel-${i}`}
                  className="animate-pulse rounded-2xl bg-white p-3 h-20"
                />
              ))}
            </div>
          ) : sortedFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white mb-4">
                <HiOutlineChartBar className="w-7 h-7 text-muted" />
              </div>
              <p className="text-base font-semibold text-main-text mb-1">
                {filter === "all" ? "No stakes yet" : `No ${filter} stakes`}
              </p>
              <p className="text-sm text-muted text-center max-w-xs">
                {filter === "all"
                  ? "Stake on a prediction to start building your history"
                  : "Try a different filter or stake on more predictions"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedFiltered.map((g, i) => {
                const status = getStakeStatus(g);
                const stake = g.myStake!;
                return (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.03 * i }}
                  >
                    <Link
                      href={`/prediction-detail?id=${g.id}`}
                      className="flex items-center gap-3 rounded-2xl bg-white p-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                    >
                      <EmojiAvatar
                        avatar={toAvatar(g.avatarEmoji, g.avatarColor)}
                        size={44}
                        shape="square"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-main-text truncate">
                          {g.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted inline-flex items-center gap-2">
                          <span className="inline-flex items-center gap-1">
                            <span
                              className={`font-medium ${
                                normalizeSide(stake.side) === 0
                                  ? "text-emerald-500"
                                  : "text-red-400"
                              }`}
                            >
                              {sideLabel(stake.side)}
                            </span>
                            <span>·</span>
                            <span>
                              {stake.staked} <UsdtLabel size={9} />
                            </span>
                          </span>
                          {status === "claimed" && stake.claimedAmount && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-500">
                                +{stake.claimedAmount} <UsdtLabel size={9} />
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-semibold rounded-full px-2.5 py-1 ${statusBadgeColor(status)}`}
                      >
                        {statusLabel(status)}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </PageTransition>
      <BottomTabBar />
    </div>
  );
}
