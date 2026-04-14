import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser } from "@/types";

type AuthState = {
  accessToken: string | null;
  wallet: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      wallet: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setAuth: (token, user) =>
        set({
          accessToken: token,
          wallet: user.wallet,
          user,
          isAuthenticated: true,
          isLoading: false,
        }),
      clearAuth: () =>
        set({
          accessToken: null,
          wallet: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
      setToken: (token) => set({ accessToken: token }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "circlo-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
      partialize: (state) => ({
        accessToken: state.accessToken,
        wallet: state.wallet,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
