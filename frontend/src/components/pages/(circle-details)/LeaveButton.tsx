"use client";

import { createCircloClient } from "circlo-sdk";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiOutlineArrowRightOnRectangle, HiXMark } from "react-icons/hi2";
import { toast } from "sonner";
import { useAccount, useWalletClient } from "wagmi";
import { useSheetOverflow } from "@/hooks";
import { circlesApi } from "@/lib/api/endpoints";
import { useAuthStore } from "@/stores/authStore";

type LeaveButtonProps = {
  circleId?: number;
  circleBackendId?: string;
  circleName?: string;
};

export default function LeaveButton({
  circleId,
  circleBackendId,
  circleName,
}: LeaveButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected } = useAccount();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: walletClient } = useWalletClient();

  useSheetOverflow(open);

  async function handleLeave() {
    if (!isConnected || !isAuthenticated) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!circleId) {
      toast.error("Circle is not on-chain yet");
      return;
    }
    if (!walletClient) {
      toast.error("Wallet not ready — please reconnect");
      return;
    }

    setIsLoading(true);
    try {
      const circlo = createCircloClient({ walletClient });
      await circlo.leaveCircle(BigInt(circleId));

      if (circleBackendId) {
        try {
          await circlesApi.leave(circleBackendId);
        } catch {}
      }

      toast.success("Left circle");
      setOpen(false);
      setTimeout(() => router.push("/circles"), 600);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("User rejected") || message.includes("denied")) {
        toast("Transaction cancelled");
      } else if (message.includes("OwnerCannotLeave")) {
        toast.error("Owners cannot leave their own circle");
      } else if (message.includes("NotMember")) {
        toast("You're not a member of this circle");
      } else {
        toast.error("Failed to leave. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-medium text-red-500 cursor-pointer transition-all duration-200 active:scale-[0.98]"
        >
          <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
          Leave circle
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoading && setOpen(false)}
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
              className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 rounded-t-3xl bg-white"
            >
              <div className="flex items-start justify-between px-6 pt-6 pb-2">
                <div>
                  <h2 className="text-xl font-bold text-main-text">
                    Leave circle?
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {circleName
                      ? `You'll no longer be a member of "${circleName}".`
                      : "You'll no longer be a member of this circle."}
                  </p>
                </div>
                {!isLoading && (
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-95"
                  >
                    <HiXMark className="w-5 h-5 text-main-text" />
                  </button>
                )}
              </div>

              <div className="px-6 pb-6 pt-2">
                <div className="rounded-2xl bg-gray-50 p-4 mb-5">
                  <p className="text-sm text-muted leading-relaxed">
                    Your active stakes on goals in this circle will remain on-chain
                    until each goal resolves. You can still claim your winnings later.
                  </p>
                </div>

                <motion.button
                  type="button"
                  onClick={handleLeave}
                  disabled={isLoading}
                  whileTap={isLoading ? {} : { scale: 0.97 }}
                  className="w-full rounded-full bg-red-500 py-4 text-base font-semibold text-white cursor-pointer disabled:bg-red-300 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading ? "Leaving..." : "Leave Circle"}
                </motion.button>

                <button
                  type="button"
                  onClick={() => !isLoading && setOpen(false)}
                  disabled={isLoading}
                  className="w-full mt-3 text-sm font-medium text-muted cursor-pointer text-center disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
