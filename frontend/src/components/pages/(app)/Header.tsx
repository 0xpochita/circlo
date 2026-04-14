"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { toast } from "sonner";
import { useUserStore } from "@/stores/userStore";
import { useAuth } from "@/hooks/useAuth";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";

export default function Header() {
  const avatar = useUserStore((s) => s.avatar);
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const { login } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  async function handleConnect() {
    setIsConnecting(true);
    try {
      connect({ connector: injected() });
      await login();
      toast.success("Wallet connected");
    } catch {
      toast.error("Failed to connect wallet");
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
          <p className="text-sm text-white/80">Welcome back</p>
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
