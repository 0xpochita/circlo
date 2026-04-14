"use client";

import { useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/lib/api/endpoints";
import { celoSepolia } from "@/lib/web3/config";

export function useAuth() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setAuth, clearAuth, setToken, setLoading, isLoading, isAuthenticated, user } =
    useAuthStore();

  const login = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");

    setLoading(true);
    try {
      const nonceRes = await authApi.nonce(address);

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Circlo",
        uri: window.location.origin,
        version: "1",
        chainId: celoSepolia.id,
        nonce: nonceRes.nonce,
      });

      const messageString = message.prepareMessage();
      const signature = await signMessageAsync({ message: messageString });
      const verifyRes = await authApi.verify(messageString, signature);

      const u = verifyRes.user;
      setAuth(verifyRes.accessToken, {
        id: u.id,
        wallet: u.walletAddress,
        username: u.username,
        displayName: u.name,
        avatar: u.avatarEmoji && u.avatarColor ? `${u.avatarEmoji}|${u.avatarColor}` : null,
        createdAt: u.createdAt,
      });
    } catch (error) {
      clearAuth();
      throw error;
    }
  }, [address, signMessageAsync, setAuth, clearAuth, setLoading]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const refresh = useCallback(async () => {
    try {
      const res = await authApi.refresh();
      setToken(res.accessToken);
    } catch {
      clearAuth();
    }
  }, [setToken, clearAuth]);

  return { login, logout, refresh, isLoading, isAuthenticated, user, address };
}
