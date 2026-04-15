import { create } from "zustand";
import type { UserAvatar } from "@/types";

type CreateGoalState = {
  circleId: string;
  circleChainId: string;
  circleName: string;
  title: string;
  description: string;
  outcomeType: number;
  durationHours: number;
  customDeadline: string;
  stakeAmount: string;
  avatar: UserAvatar;
  resolvers: string[];
  resolverNames: string[];
  setCircleId: (id: string) => void;
  setCircleChainId: (chainId: string) => void;
  setCircleName: (name: string) => void;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setOutcomeType: (type: number) => void;
  setDurationHours: (hours: number) => void;
  setCustomDeadline: (date: string) => void;
  setStakeAmount: (amount: string) => void;
  setAvatar: (avatar: UserAvatar) => void;
  setResolvers: (resolvers: string[]) => void;
  setResolverNames: (names: string[]) => void;
  reset: () => void;
};

const initialState = {
  circleId: "",
  circleChainId: "",
  circleName: "",
  title: "",
  description: "",
  outcomeType: 0,
  durationHours: 168,
  customDeadline: "",
  stakeAmount: "",
  avatar: { emoji: "🎯", color: "#ec4899" },
  resolvers: [] as string[],
  resolverNames: [] as string[],
};

export const useCreateGoalStore = create<CreateGoalState>((set) => ({
  ...initialState,
  setCircleId: (circleId) => set({ circleId }),
  setCircleChainId: (circleChainId) => set({ circleChainId }),
  setCircleName: (circleName) => set({ circleName }),
  setTitle: (title) => set({ title }),
  setDescription: (description) => set({ description }),
  setOutcomeType: (outcomeType) => set({ outcomeType }),
  setDurationHours: (durationHours) => set({ durationHours }),
  setCustomDeadline: (customDeadline) => set({ customDeadline }),
  setStakeAmount: (stakeAmount) => set({ stakeAmount }),
  setAvatar: (avatar) => set({ avatar }),
  setResolvers: (resolvers) => set({ resolvers }),
  setResolverNames: (resolverNames) => set({ resolverNames }),
  reset: () => set(initialState),
}));
