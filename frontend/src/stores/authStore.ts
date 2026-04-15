import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthUser } from "@/types";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  wallet: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (
    accessToken: string,
    refreshToken: string | null,
    user: AuthUser,
  ) => void;
  clearAuth: () => void;
  setToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      wallet: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setAuth: (accessToken, refreshToken, user) =>
        set({
          accessToken,
          refreshToken,
          wallet: user.wallet,
          user,
          isAuthenticated: true,
          isLoading: false,
        }),
      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          wallet: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
      setToken: (accessToken) => set({ accessToken }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "circlo-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        wallet: state.wallet,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
