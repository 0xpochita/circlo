import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserAvatar } from "@/types";

type UserState = {
  name: string;
  username: string;
  avatar: UserAvatar;
  setAvatar: (avatar: UserAvatar) => void;
  setName: (name: string) => void;
  setUsername: (username: string) => void;
  reset: () => void;
};

const initialState = {
  name: "Player",
  username: "",
  avatar: { emoji: "🚀", color: "#ec4899" } as UserAvatar,
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      ...initialState,
      setAvatar: (avatar) => set({ avatar }),
      setName: (name) => set({ name }),
      setUsername: (username) => set({ username }),
      reset: () => set(initialState),
    }),
    {
      name: "circlo-user",
    },
  ),
);
