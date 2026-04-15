import { create } from "zustand";
import type { UserAvatar } from "@/types";

type CreateGoalState = {
  circleId: string;
  circleChainId: string;
  title: string;
  description: string;
  outcomeType: number;
  durationHours: number;
  stakeAmount: string;
  avatar: UserAvatar;
  resolvers: string[];
  setCircleId: (id: string) => void;
  setCircleChainId: (chainId: string) => void;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setOutcomeType: (type: number) => void;
  setDurationHours: (hours: number) => void;
  setStakeAmount: (amount: string) => void;
  setAvatar: (avatar: UserAvatar) => void;
  setResolvers: (resolvers: string[]) => void;
  reset: () => void;
};

const initialState = {
  circleId: "",
  circleChainId: "",
  title: "",
  description: "",
  outcomeType: 0,
  durationHours: 168,
  stakeAmount: "",
  avatar: { emoji: "🎯", color: "#ec4899" },
  resolvers: [] as string[],
};

export const useCreateGoalStore = create<CreateGoalState>((set) => ({
  ...initialState,
  setCircleId: (circleId) => set({ circleId }),
  setCircleChainId: (circleChainId) => set({ circleChainId }),
  setTitle: (title) => set({ title }),
  setDescription: (description) => set({ description }),
  setOutcomeType: (outcomeType) => set({ outcomeType }),
  setDurationHours: (durationHours) => set({ durationHours }),
  setStakeAmount: (stakeAmount) => set({ stakeAmount }),
  setAvatar: (avatar) => set({ avatar }),
  setResolvers: (resolvers) => set({ resolvers }),
  reset: () => set(initialState),
}));
