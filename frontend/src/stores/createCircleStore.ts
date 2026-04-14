import { create } from "zustand";
import type { UserAvatar } from "@/types";

type CreateCircleState = {
  name: string;
  description: string;
  category: string;
  privacy: "public" | "private";
  avatar: UserAvatar;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setCategory: (category: string) => void;
  setPrivacy: (privacy: "public" | "private") => void;
  setAvatar: (avatar: UserAvatar) => void;
  reset: () => void;
};

const initialState = {
  name: "",
  description: "",
  category: "general",
  privacy: "public" as const,
  avatar: { emoji: "🌟", color: "#ec4899" },
};

export const useCreateCircleStore = create<CreateCircleState>((set) => ({
  ...initialState,
  setName: (name) => set({ name }),
  setDescription: (description) => set({ description }),
  setCategory: (category) => set({ category }),
  setPrivacy: (privacy) => set({ privacy }),
  setAvatar: (avatar) => set({ avatar }),
  reset: () => set(initialState),
}));
