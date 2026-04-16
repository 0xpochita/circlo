import { create } from "zustand";
import type { CircleResponse, GoalResponse } from "@/lib/api/endpoints";
import type { CircleWithCount } from "@/hooks/useCircles";

const STALE_MS = 60_000;

type CacheKey = "myCircles" | "myGoals" | "feedGoal" | "publicCircles";

type DataCacheState = {
  myCircles: CircleWithCount[];
  myCirclesAt: number;
  myGoals: GoalResponse[];
  myGoalsAt: number;
  feedGoal: GoalResponse | null;
  feedGoalAt: number;
  publicCircles: CircleResponse[];
  publicCirclesAt: number;

  setMyCircles: (circles: CircleWithCount[]) => void;
  setMyGoals: (goals: GoalResponse[]) => void;
  setFeedGoal: (goal: GoalResponse | null) => void;
  setPublicCircles: (circles: CircleResponse[]) => void;

  isStale: (key: CacheKey) => boolean;
  invalidate: (key: CacheKey) => void;
};

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
    const timestamps: Record<string, number> = {
      myCircles: get().myCirclesAt,
      myGoals: get().myGoalsAt,
      feedGoal: get().feedGoalAt,
      publicCircles: get().publicCirclesAt,
    };
    return Date.now() - (timestamps[key] || 0) > STALE_MS;
  },

  invalidate: (key) => {
    const resets: Record<string, object> = {
      myCircles: { myCirclesAt: 0 },
      myGoals: { myGoalsAt: 0 },
      feedGoal: { feedGoalAt: 0 },
      publicCircles: { publicCirclesAt: 0 },
    };
    set(resets[key] || {});
  },
}));
