"use client";

import Image from "next/image";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { HiOutlineArrowDownTray, HiOutlinePaperAirplane, HiOutlineBeaker } from "react-icons/hi2";
import { mockUSDTContract } from "@/lib/web3/contracts";
import { fromUSDT } from "@/lib/web3/usdt";

export default function BalanceCard() {
  const { address, isConnected } = useAccount();

  const { data: rawBalance, isLoading } = useReadContract({
    ...mockUSDTContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const balance = rawBalance ? fromUSDT(rawBalance as bigint) : 0;

  if (!isConnected) {
    return (
      <div className="px-4 py-2">
        <div className="rounded-2xl bg-white/20 backdrop-blur-md px-4 py-3">
          <p className="text-sm text-white/80 text-center">
            Connect wallet to see your balance
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl bg-black/30 backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-white/60">Your Balance</p>
            <div className="flex items-center gap-2 mt-0.5">
              {isLoading ? (
                <div className="h-7 w-20 rounded-lg bg-white/20 animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-white">{balance.toFixed(2)}</p>
              )}
              <div className="flex items-center gap-1 rounded-full bg-white/30 px-2 py-0.5">
                <Image
                  src="/Assets/Images/Logo/logo-coin/usdt-logo.svg"
                  alt="USDT"
                  width={14}
                  height={14}
                />
                <span className="text-xs font-semibold text-white">USDT</span>
              </div>
            </div>
          </div>
          <Image
            src="/Assets/Images/Logo/logo-coin/celo-logo.svg"
            alt="Celo"
            width={28}
            height={28}
            className="opacity-60"
          />
        </div>

        <div className="flex gap-2">
          <Link
            href="/profile"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-xs font-semibold text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
          >
            <HiOutlineArrowDownTray className="w-4 h-4" />
            Deposit
          </Link>
          <Link
            href="/profile"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/30 py-2.5 text-xs font-semibold text-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
          >
            <HiOutlinePaperAirplane className="w-4 h-4" />
            Send
          </Link>
          <Link
            href="/profile"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-white/30 px-3 py-2.5 text-xs font-semibold text-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
          >
            <HiOutlineBeaker className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
