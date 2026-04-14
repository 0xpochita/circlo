"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { HiOutlineShieldCheck, HiOutlineBolt, HiOutlineUserGroup } from "react-icons/hi2";
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

const features = [
  { icon: HiOutlineShieldCheck, title: "Non-custodial", desc: "Your keys, your funds" },
  { icon: HiOutlineBolt, title: "Instant", desc: "Sub-second transactions on Celo" },
  { icon: HiOutlineUserGroup, title: "Social", desc: "Predict goals with friends" },
];

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
        // SIWE failed — backend might not be ready
        // continue with wallet-only auth
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
    <div className="flex flex-col min-h-dvh px-6 py-10">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-muted cursor-pointer mb-8"
      >
        Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col"
      >
        <div className="flex items-center gap-3 mb-2">
          <Image
            src="/Assets/Images/Logo/logo-coin/celo-logo.svg"
            alt="Celo"
            width={32}
            height={32}
          />
          <p className="text-xs text-muted uppercase tracking-wide font-medium">Celo Network</p>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-main-text mb-2">
          Connect your wallet
        </h1>
        <p className="text-sm text-muted mb-8">
          Sign in securely with your wallet. MetaMask or MiniPay supported.
        </p>

        <div className="flex flex-col gap-3 mb-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + 0.1 * i }}
              className="flex items-center gap-3 rounded-2xl bg-white p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50">
                <f.icon className="w-5 h-5 text-main-text" />
              </div>
              <div>
                <p className="text-sm font-semibold text-main-text">{f.title}</p>
                <p className="text-xs text-muted">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="w-full"
      >
        <motion.button
          type="button"
          onClick={handleConnect}
          disabled={isConnecting}
          whileTap={isConnecting ? {} : { scale: 0.97 }}
          className="w-full rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
        >
          {isConnecting ? statusText : "Connect Wallet"}
        </motion.button>
      </motion.div>
    </div>
  );
}
