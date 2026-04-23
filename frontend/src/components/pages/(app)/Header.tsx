"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { EmojiAvatar } from "@/components/shared";
import { useAuth } from "@/hooks/useAuth";
import { NETWORK } from "@/lib/web3/network";
import { useUserStore } from "@/stores/userStore";

export default function Header() {
  const avatar = useUserStore((s) => s.avatar);
  const userName = useUserStore((s) => s.name);
  const { isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { login } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const result = await connectAsync({
        connector: injected(),
        chainId: NETWORK.id,
      });
      const walletAddress = result.accounts[0];
      if (!walletAddress) {
        toast.error("No account found");
        return;
      }
      await login(walletAddress);
      toast.success("Wallet connected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("User rejected") || msg.includes("denied")) {
        toast("Connection cancelled");
      } else {
        toast.error("Failed to connect wallet");
      }
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="relative z-10 flex items-center justify-between px-4 pt-14 pb-2">
      <div className="flex items-center gap-3">
        <Image
          src="/Assets/Images/Logo/logo-brand/logo-brand.webp"
          alt="Circlo Logo"
          width={44}
          height={44}
          className="rounded-xl"
        />
        <div>
          <p className="text-sm text-white/80">
            {isConnected && userName && userName !== "Player"
              ? `Welcome back, ${userName}`
              : "Welcome back"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Circlo
          </h1>
        </div>
      </div>
      {isConnected ? (
        <Link href="/profile" className="cursor-pointer">
          <EmojiAvatar avatar={avatar} size={44} />
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          disabled={isConnecting}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95] disabled:opacity-60"
        >
          {isConnecting ? "Connecting..." : "Connect"}
        </button>
      )}
    </div>
  );
}
