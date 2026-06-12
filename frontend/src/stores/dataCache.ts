import { create } from "zustand";
import type { CircleWithCount } from "@/hooks/useCircles";
import type {
  CircleResponse,
  GoalResponse,
  GoalWithMyStake,
} from "@/lib/api/endpoints";

/**
 * Stale-while-revalidate window. Cached entries served instantly
 * within 60s; older entries trigger a refetch in the background
 * but still render the cached value first to avoid skeleton flash.
 */
const STALE_MS = 60_000;

/**
 * Identifiers for each cached collection. Keep narrow — adding a
 * key means adding both a `set*` method and a timestamp field.
 */
type CacheKey = "myCircles" | "myGoals" | "feedGoal" | "publicCircles";

type DataCacheState = {
  myCircles: CircleWithCount[];
  myCirclesAt: number;
  myGoals: GoalWithMyStake[];
  myGoalsAt: number;
  feedGoal: GoalResponse | null;
  feedGoalAt: number;
  publicCircles: CircleResponse[];
  publicCirclesAt: number;

  setMyCircles: (circles: CircleWithCount[]) => void;
  setMyGoals: (goals: GoalWithMyStake[]) => void;
  setFeedGoal: (goal: GoalResponse | null) => void;
  setPublicCircles: (circles: CircleResponse[]) => void;

  isStale: (key: CacheKey) => boolean;
  invalidate: (key: CacheKey) => void;
};

/**
 * Cross-component data cache with stale-while-revalidate semantics.
 *
 * Consumer pattern:
 *   1. Render cached value immediately (no skeleton).
 *   2. Call `isStale(key)` — if stale, kick off a background refetch.
 *   3. On refetch success, `set*` updates the cache and re-triggers
 *      subscribers (Zustand's referential equality).
 *
 * Use `invalidate(key)` after a mutation (created circle, claimed
 * reward) to force the next read through. Reset on logout (clears
 * authStore) via `useUserStore.reset()` → `useDataCache.reset()`.
 */
export const useDataCache = create<DataCacheState>((set, get) => ({
  myCircles: [],
  myCirclesAt: 0,
  myGoals: [],
  myGoalsAt: 0,
  feedGoal: null,
  feedGoalAt: 0,
  publicCircles: [],
  publicCirclesAt: 0,

  setMyCircles: (myCircles) => set({ myCircles, myCirclesAt: Date.now() }),
  setMyGoals: (myGoals) => set({ myGoals, myGoalsAt: Date.now() }),
  setFeedGoal: (feedGoal) => set({ feedGoal, feedGoalAt: Date.now() }),
  setPublicCircles: (publicCircles) =>
    set({ publicCircles, publicCirclesAt: Date.now() }),

  isStale: (key) => {
    const timestamps: Record<CacheKey, number> = {
      myCircles: get().myCirclesAt,
      myGoals: get().myGoalsAt,
      feedGoal: get().feedGoalAt,
      publicCircles: get().publicCirclesAt,
    };
    return Date.now() - (timestamps[key] || 0) > STALE_MS;
  },

  invalidate: (key) => {
    const resets: Record<CacheKey, object> = {
      myCircles: { myCirclesAt: 0 },
      myGoals: { myGoalsAt: 0 },
      feedGoal: { feedGoalAt: 0 },
      publicCircles: { publicCirclesAt: 0 },
    };
    set(resets[key] || {});
  },
}));
