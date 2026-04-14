import { create } from "zustand";
import type { Goal } from "@/types";

type GoalState = {
  goals: Goal[];
  selectedGoal: Goal | null;
  myGoals: Goal[];
  feed: Goal[];
  isLoading: boolean;
  error: string | null;
  setGoals: (goals: Goal[]) => void;
  setSelectedGoal: (goal: Goal | null) => void;
  setMyGoals: (goals: Goal[]) => void;
  setFeed: (goals: Goal[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const useGoalStore = create<GoalState>()((set) => ({
  goals: [],
  selectedGoal: null,
  myGoals: [],
  feed: [],
  isLoading: false,
  error: null,
  setGoals: (goals) => set({ goals }),
  setSelectedGoal: (goal) => set({ selectedGoal: goal }),
  setMyGoals: (goals) => set({ myGoals: goals }),
  setFeed: (goals) => set({ feed: goals }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      goals: [],
      selectedGoal: null,
      myGoals: [],
      feed: [],
      isLoading: false,
      error: null,
    }),
}));
