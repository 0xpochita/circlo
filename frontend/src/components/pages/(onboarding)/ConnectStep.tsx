"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import { toast } from "sonner";
import { useConnect, useDisconnect, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";
import { useState, useEffect } from "react";
import { SiweMessage } from "siwe";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/lib/api/endpoints";
import { celoSepolia } from "@/lib/web3/config";

type ConnectStepProps = {
  onNext: () => void;
  onBack: () => void;
};

export default function ConnectStep({ onNext, onBack }: ConnectStepProps) {
  const { connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setLoading = useAuthStore((s) => s.setLoading);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusText, setStatusText] = useState("Connect Wallet");

  useEffect(() => {
    disconnectAsync().catch(() => {});
  }, []);

  async function handleConnect() {
    setIsConnecting(true);
    setStatusText("Connecting wallet...");

    try {
      const result = await connectAsync({
        connector: injected(),
        chainId: celoSepolia.id,
      });

      const walletAddress = result.accounts[0];
      if (!walletAddress) {
        toast.error("No account found");
        setIsConnecting(false);
        setStatusText("Connect Wallet");
        return;
      }

      setStatusText("Requesting sign-in...");
      setLoading(true);

      let accessToken: string | null = null;
      let user = null;

      try {
        const nonceRes = await authApi.nonce(walletAddress);
        const nonce = nonceRes.nonce;

        if (nonce) {
          setStatusText("Sign the message...");

          const message = new SiweMessage({
            domain: window.location.host,
            address: walletAddress,
            statement: "Sign in to Circlo",
            uri: window.location.origin,
            version: "1",
            chainId: celoSepolia.id,
            nonce,
          });

          const messageString = message.prepareMessage();
          const signature = await signMessageAsync({ message: messageString });

          setStatusText("Verifying...");
          const verifyRes = await authApi.verify(messageString, signature);

          accessToken = verifyRes.accessToken || null;
          user = verifyRes.user || null;
        }
      } catch {
        // SIWE failed — continue with wallet-only auth
      }

      if (accessToken && user) {
        const u = user as {
          id: string;
          walletAddress: string;
          name: string | null;
          username: string | null;
          avatarEmoji: string | null;
          avatarColor: string | null;
          createdAt: string;
        };
        setAuth(accessToken, {
          id: u.id,
          wallet: u.walletAddress,
          username: u.username,
          displayName: u.name,
          avatar: u.avatarEmoji && u.avatarColor ? `${u.avatarEmoji}|${u.avatarColor}` : null,
          createdAt: u.createdAt,
        });
      } else {
        setAuth(walletAddress, {
          id: walletAddress,
          wallet: walletAddress,
          username: `@${walletAddress.slice(2, 8).toLowerCase()}`,
          displayName: "Player",
          avatar: null,
          createdAt: new Date().toISOString(),
        });
      }

      toast.success("Wallet connected!");
      onNext();
    } catch {
      toast.error("Could not connect wallet. Please try again.");
      setStatusText("Connect Wallet");
    } finally {
      setIsConnecting(false);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <div className="flex items-center gap-3 px-6 pt-6 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-95"
        >
          <HiOutlineArrowLeft className="w-4 h-4 text-main-text" />
        </button>
        <div className="flex-1 flex flex-col items-center">
          <p className="text-xs text-gray-400 mb-1">1 / 2</p>
          <div className="flex w-full gap-1.5">
            <div className="h-1 flex-1 rounded-full bg-emerald-500" />
            <div className="h-1 flex-1 rounded-full bg-gray-200" />
          </div>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mt-6 mb-4"
        >
          <h1 className="text-2xl font-bold tracking-tight text-emerald-500">
            Connect wallet
          </h1>
          <p className="mt-1 text-xs text-gray-400 uppercase tracking-[0.2em]">
            Secure sign-in with Celo
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full rounded-3xl bg-white overflow-hidden mb-6"
        >
          <div className="flex flex-col items-center justify-end h-56 relative">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-64 h-64 rounded-full bg-gray-100/60" />
            <div className="relative z-10 flex items-end gap-3 pb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-200/50">
                <Image
                  src="/Assets/Images/Logo/logo-coin/celo-logo.svg"
                  alt="Celo"
                  width={28}
                  height={28}
                />
              </div>
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-gray-300" />
              </div>
              <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mb-auto"
        >
          <p className="text-sm text-gray-400 leading-relaxed max-w-70 mx-auto">
            Sign in securely with your wallet. MetaMask or MiniPay supported. No passwords needed.
          </p>
          <p className="mt-3 text-sm font-medium text-emerald-500">
            Your keys, your funds.
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="px-6 pb-8 pt-6"
      >
        <motion.button
          type="button"
          onClick={handleConnect}
          disabled={isConnecting}
          whileTap={isConnecting ? {} : { scale: 0.97 }}
          className="w-full rounded-full bg-gray-900 py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
        >
          {isConnecting ? statusText : "Connect Wallet"}
        </motion.button>
        <button
          type="button"
          onClick={onBack}
          className="w-full mt-3 text-sm font-medium text-gray-400 cursor-pointer text-center underline"
        >
          Go back
        </button>
      </motion.div>
    </div>
  );
}
