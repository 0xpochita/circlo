"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiOutlineMagnifyingGlass, HiOutlineBell, HiOutlinePencil } from "react-icons/hi2";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { toast } from "sonner";
import { useUserStore } from "@/stores/userStore";
import { useAuth } from "@/hooks/useAuth";
import { useUSDTBalance } from "@/hooks/useUSDT";
import { EmojiAvatar, EmojiPicker } from "@/components/shared";
import NotificationSheet from "./NotificationSheet";
import DepositSheet from "./DepositSheet";
import WithdrawSheet from "./WithdrawSheet";

export default function ProfileHero() {
  const router = useRouter();
  const name = useUserStore((s) => s.name);
  const avatar = useUserStore((s) => s.avatar);
  const setAvatar = useUserStore((s) => s.setAvatar);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { login } = useAuth();
  const { formatted: usdtBalance, isLoading: isBalanceLoading } = useUSDTBalance(address);

  const displayBalance = isBalanceLoading ? "..." : usdtBalance.toFixed(2);
  const unreadCount = 3;

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
    <>
      <div className="relative overflow-hidden rounded-b-3xl">
        <Image
          src="/Assets/Images/Background/bg-cloud.webp"
          alt="Background"
          width={448}
          height={320}
          className="absolute inset-0 h-full w-full object-cover"
          priority
        />
        <div className="relative z-10 px-4 pt-14 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="relative cursor-pointer"
              >
                <EmojiAvatar avatar={avatar} size={44} />
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white">
                  <HiOutlinePencil className="w-3 h-3 text-main-text" />
                </div>
              </button>
              <p className="text-base font-semibold text-white">Hi, {name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/explore")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md cursor-pointer transition-all duration-200 active:scale-[0.95]"
              >
                <HiOutlineMagnifyingGlass className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                onClick={() => setNotifOpen(true)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md cursor-pointer transition-all duration-200 active:scale-[0.95]"
              >
                <HiOutlineBell className="w-5 h-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white/30" />
                )}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-white/70">My Wallet</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-white">{displayBalance}</p>
              <div className="flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-1 text-sm font-semibold text-white">
                USDT
                <Image
                  src="/Assets/Images/Logo/logo-coin/usdt-logo.svg"
                  alt="USDT"
                  width={16}
                  height={16}
                />
              </div>
            </div>
            {isConnected && (
              <p className="mt-1 text-sm font-medium text-emerald-300">+2.30 (22.5%)</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <button
                  type="button"
                  onClick={() => setDepositOpen(true)}
                  className="flex-1 rounded-full bg-white py-3 text-sm font-semibold text-main-text cursor-pointer transition-all duration-200 active:scale-[0.97]"
                >
                  + Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawOpen(true)}
                  className="flex-1 rounded-full bg-white py-3 text-sm font-semibold text-main-text cursor-pointer transition-all duration-200 active:scale-[0.97]"
                >
                  Withdraw
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex-1 rounded-full bg-white py-3 text-sm font-semibold text-main-text cursor-pointer transition-all duration-200 active:scale-[0.97] disabled:opacity-60"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </div>

      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={avatar}
        onSave={setAvatar}
      />
      <NotificationSheet open={notifOpen} onClose={() => setNotifOpen(false)} />
      <DepositSheet
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        walletAddress={address ?? ""}
      />
      <WithdrawSheet open={withdrawOpen} onClose={() => setWithdrawOpen(false)} balance={displayBalance} />
    </>
  );
}
