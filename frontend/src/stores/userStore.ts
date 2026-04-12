import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserAvatar } from "@/types";

type UserState = {
  name: string;
  username: string;
  avatar: UserAvatar;
  setAvatar: (avatar: UserAvatar) => void;
  setName: (name: string) => void;
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      name: "Player",
      username: "@player",
      avatar: { emoji: "🚀", color: "#ec4899" },
      setAvatar: (avatar) => set({ avatar }),
      setName: (name) => set({ name }),
    }),
    {
      name: "circlo-user",
    }
  )
);
