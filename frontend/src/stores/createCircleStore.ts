import { create } from "zustand";
import type { UserAvatar } from "@/types";

type CreateCircleState = {
  name: string;
  description: string;
  category: string;
  privacy: "public" | "private";
  avatar: UserAvatar;
  inviteUsernames: string[];
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setCategory: (category: string) => void;
  setPrivacy: (privacy: "public" | "private") => void;
  setAvatar: (avatar: UserAvatar) => void;
  toggleInvite: (username: string) => void;
  reset: () => void;
};

const initialState = {
  name: "",
  description: "",
  category: "general",
  privacy: "public" as const,
  avatar: { emoji: "🌟", color: "#ec4899" },
  inviteUsernames: [] as string[],
};

export const useCreateCircleStore = create<CreateCircleState>((set) => ({
  ...initialState,
  setName: (name) => set({ name }),
  setDescription: (description) => set({ description }),
  setCategory: (category) => set({ category }),
  setPrivacy: (privacy) => set({ privacy }),
  setAvatar: (avatar) => set({ avatar }),
  toggleInvite: (username) =>
    set((state) => ({
      inviteUsernames: state.inviteUsernames.includes(username)
        ? state.inviteUsernames.filter((u) => u !== username)
        : [...state.inviteUsernames, username],
    })),
  reset: () => set(initialState),
}));
