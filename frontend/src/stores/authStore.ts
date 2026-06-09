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
  setUser: (partial: Partial<AuthUser>) => void;
  setLoading: (loading: boolean) => void;
};

/**
 * Persistent auth Zustand store.
 *
 * Holds the JWT pair, the resolved User row, and a derived
 * `isAuthenticated` flag. Persists to localStorage under
 * `circlo-auth` so a refresh doesn't drop the session — but the
 * persisted token is checked against the wallet on every render via
 * `useAuth`'s effect, so a stale JWT can't authenticate a different
 * wallet.
 *
 * `isLoading` is owned by the login round-trip so the connect button
 * can show a spinner without a separate local state.
 */
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
      setUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : state.user,
        })),
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
