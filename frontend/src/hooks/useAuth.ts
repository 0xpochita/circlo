"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { SiweMessage } from "siwe";
import { useAccount, useSignMessage } from "wagmi";
import { authApi } from "@/lib/api/endpoints";
import { NETWORK } from "@/lib/web3/network";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useUserStore } from "@/stores/userStore";

export function useAuth() {
  const router = useRouter();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const {
    setAuth,
    clearAuth,
    setToken,
    setLoading,
    isLoading,
    isAuthenticated,
    user,
  } = useAuthStore();
  const storedWallet = useAuthStore((s) => s.wallet);

  useEffect(() => {
    if (!address || !storedWallet) return;
    if (address.toLowerCase() === storedWallet.toLowerCase()) return;

    clearAuth();
    useNotificationStore.getState().reset();
    useUserStore.getState().reset();
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/welcome"
    ) {
      router.replace("/welcome");
    }
  }, [address, storedWallet, clearAuth, router]);

  const login = useCallback(
    async (addr?: string) => {
      const walletAddr = addr ?? address;
      if (!walletAddr) throw new Error("Wallet not connected");

      setLoading(true);
      try {
        const nonceRes = await authApi.nonce(walletAddr);

        const message = new SiweMessage({
          domain: window.location.host,
          address: walletAddr,
          statement: "Sign in to Circlo",
          uri: window.location.origin,
          version: "1",
          chainId: NETWORK.id,
          nonce: nonceRes.nonce,
        });

        const messageString = message.prepareMessage();
        const signature = await signMessageAsync({ message: messageString });
        const verifyRes = await authApi.verify(messageString, signature);

        const u = verifyRes.user;
        setAuth(verifyRes.accessToken, verifyRes.refreshToken || null, {
          id: u.id,
          wallet: u.walletAddress,
          username: u.username,
          displayName: u.name,
          avatar:
            u.avatarEmoji && u.avatarColor
              ? `${u.avatarEmoji}|${u.avatarColor}`
              : null,
          createdAt: u.createdAt,
        });

        useNotificationStore.getState().fetchNotifications();
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [address, signMessageAsync, setAuth, setLoading],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      useNotificationStore.getState().reset();
    }
  }, [clearAuth]);

  const refresh = useCallback(async () => {
    try {
      const res = await authApi.refresh();
      if (res.accessToken) {
        setToken(res.accessToken);
      }
    } catch {
      // Don't clear auth on transient refresh failures
    }
  }, [setToken]);

  return { login, logout, refresh, isLoading, isAuthenticated, user, address };
}
