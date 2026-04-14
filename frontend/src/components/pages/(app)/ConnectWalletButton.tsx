"use client";

import { useState } from "react";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function ConnectWalletButton() {
  const { connect } = useConnect();
  const { login } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  async function handleConnect() {
    setIsConnecting(true);
    try {
      connect({ connector: injected() });
      await login();
      toast.success("Wallet connected successfully");
    } catch {
      toast.error("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={isConnecting}
      className="w-full rounded-full bg-main-text py-4 text-base font-semibold text-white cursor-pointer transition-all duration-200 active:scale-[0.97] disabled:opacity-60"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
