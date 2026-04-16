"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import {
  HiOutlineArrowDownTray,
  HiOutlineBeaker,
  HiOutlinePaperAirplane,
  HiXMark,
} from "react-icons/hi2";
import { toast } from "sonner";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { DepositSheet, WithdrawSheet } from "@/components/pages/(profile)";
import { UsdtLabel } from "@/components/shared";
import { useSheetOverflow } from "@/hooks";
import { mockUSDTContract } from "@/lib/web3/contracts";
import { fromUSDT } from "@/lib/web3/usdt";

export default function BalanceCard() {
  const { address, isConnected } = useAccount();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [faucetOpen, setFaucetOpen] = useState(false);
  const [isFauceting, setIsFauceting] = useState(false);

  const anySheetOpen = faucetOpen || depositOpen || withdrawOpen;

  useSheetOverflow(anySheetOpen);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const {
    data: rawBalance,
    isLoading,
    refetch,
  } = useReadContract({
    ...mockUSDTContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const balance = rawBalance ? fromUSDT(rawBalance as bigint) : 0;

  async function handleFaucet() {
    if (!isConnected) {
      toast("Connect your wallet first");
      return;
    }
    setIsFauceting(true);
    try {
      const txHash = await writeContractAsync({
        address: mockUSDTContract.address,
        abi: mockUSDTContract.abi,
        functionName: "faucet",
        args: [],
        gas: BigInt(200_000),
      });
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });
        if (receipt.status === "reverted") {
          toast.error("Faucet transaction reverted on-chain");
          setIsFauceting(false);
          return;
        }
      }
      toast.success("100 USDT received!");
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("User rejected") || message.includes("denied")) {
        toast("Transaction cancelled");
      } else if (
        message.includes("insufficient") ||
        message.includes("funds")
      ) {
        toast.error("Not enough CELO for gas fees");
      } else if (message.includes("revert")) {
        toast.error(
          "Faucet transaction reverted. You may have already claimed recently.",
        );
      } else {
        toast.error(
          message.length > 80
            ? `Faucet failed: ${message.slice(0, 80)}...`
            : `Faucet failed: ${message || "Unknown error"}`,
        );
      }
    } finally {
      setIsFauceting(false);
    }
  }

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
    <>
      <div className="px-4 py-2">
        <div className="rounded-2xl bg-black/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-white/60">Your Balance</p>
              <div className="flex items-center gap-2 mt-0.5">
                {isLoading ? (
                  <div className="h-7 w-20 rounded-lg bg-white/20 animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-white">
                    {balance.toFixed(2)}
                  </p>
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
            <button
              type="button"
              onClick={() => setDepositOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-xs font-semibold text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
            >
              <HiOutlineArrowDownTray className="w-4 h-4" />
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setWithdrawOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/30 py-2.5 text-xs font-semibold text-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
            >
              <HiOutlinePaperAirplane className="w-4 h-4" />
              Send
            </button>
            <button
              type="button"
              onClick={() => setFaucetOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/30 px-3 py-2.5 text-xs font-semibold text-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
            >
              <HiOutlineBeaker className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <DepositSheet
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        walletAddress={address ?? ""}
      />
      <WithdrawSheet
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        balance={balance.toFixed(2)}
      />

      <AnimatePresence>
        {faucetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFaucetOpen(false)}
              className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring" as const,
                stiffness: 300,
                damping: 32,
              }}
              className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 rounded-t-3xl bg-white px-6 pt-6 pb-12"
              style={{ maxHeight: "85dvh" }}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-main-text">
                    Test Faucet
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Get free USDT for testing on Celo Sepolia
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFaucetOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-[0.95]"
                >
                  <HiXMark className="w-5 h-5 text-main-text" />
                </button>
              </div>

              <div className="flex flex-col items-center mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-3">
                  <HiOutlineBeaker className="w-8 h-8 text-brand" />
                </div>
                <p className="text-3xl font-bold text-main-text mb-1">100</p>
                <UsdtLabel size={18} />
                <p className="text-sm text-muted">
                  will be sent to your wallet
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 mb-6">
                <div className="flex items-center justify-between py-1">
                  <p className="text-xs text-muted">Network</p>
                  <p className="text-xs font-medium text-main-text">
                    Celo Sepolia (Testnet)
                  </p>
                </div>
                <div className="flex items-center justify-between py-1">
                  <p className="text-xs text-muted">Token</p>
                  <p className="text-xs font-medium text-main-text">
                    Mock USDT
                  </p>
                </div>
                <div className="flex items-center justify-between py-1">
                  <p className="text-xs text-muted">Current balance</p>
                  <p className="text-xs font-medium text-main-text">
                    {balance.toFixed(2)} USDT
                  </p>
                </div>
              </div>

              <motion.button
                type="button"
                onClick={async () => {
                  await handleFaucet();
                  setFaucetOpen(false);
                }}
                disabled={isFauceting}
                whileTap={isFauceting ? {} : { scale: 0.97 }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
              >
                {isFauceting ? "Claiming..." : "Claim 100 USDT"}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
