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
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      name: "Player",
      username: "",
      avatar: { emoji: "🚀", color: "#ec4899" },
      setAvatar: (avatar) => set({ avatar }),
      setName: (name) => set({ name }),
      setUsername: (username) => set({ username }),
    }),
    {
      name: "circlo-user",
    },
  ),
);
