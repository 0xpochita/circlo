"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import {
  HiOutlineCheck,
  HiOutlineClipboard,
  HiOutlineSparkles,
  HiXMark,
} from "react-icons/hi2";
import { toast } from "sonner";
import type { Address } from "viem";
import { useAccount, useSignTypedData } from "wagmi";
import { useMiniPay, useSheetOverflow } from "@/hooks";
import {
  buildInviteUrl,
  INVITE_PROOF_TYPED_DATA_DOMAIN,
  INVITE_PROOF_TYPES,
} from "@/lib/web3/inviteProof";

type DurationKey = "1h" | "1d" | "7d" | "30d";

const DURATIONS: readonly { key: DurationKey; label: string; seconds: number }[] = [
  { key: "1h", label: "1 hour", seconds: 3600 },
  { key: "1d", label: "1 day", seconds: 86400 },
  { key: "7d", label: "7 days", seconds: 86400 * 7 },
  { key: "30d", label: "30 days", seconds: 86400 * 30 },
];

type GenerateInviteSheetProps = {
  open: boolean;
  onClose: () => void;
  circleId: string;
  chainId?: bigint;
  circleName?: string;
};

export default function GenerateInviteSheet({
  open,
  onClose,
  circleId,
  chainId,
  circleName,
}: GenerateInviteSheetProps) {
  const { address: connectedAddress } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const isMiniPayBrowser = useMiniPay();
  const [inviteeAddr, setInviteeAddr] = useState("");
  const [duration, setDuration] = useState<DurationKey>("1d");
  const [generated, setGenerated] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [copied, setCopied] = useState(false);

  useSheetOverflow(open);

  function reset() {
    setInviteeAddr("");
    setDuration("1d");
    setGenerated(null);
    setCopied(false);
    setIsSigning(false);
  }

  function handleClose() {
    if (isSigning) return;
    reset();
    onClose();
  }

  async function handleGenerate() {
    if (!connectedAddress) {
      toast.error("Connect wallet first");
      return;
    }
    if (!chainId) {
      toast.error("Circle is not on-chain yet");
      return;
    }
    if (isMiniPayBrowser) {
      // MiniPay's EIP-712 (signTypedData) support is inconsistent
      // across versions — the call may silently fail or hang. Steer
      // owners to a desktop browser for invite generation instead of
      // letting them watch a spinner that goes nowhere.
      toast.error(
        "Generating an invite uses typed-data signing, which MiniPay doesn't reliably support yet. Open Circlo in a desktop browser to generate the link, then share the URL back here.",
      );
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(inviteeAddr.trim())) {
      toast.error("Enter a valid wallet address (0x...)");
      return;
    }

    const invitee = inviteeAddr.trim() as Address;
    if (invitee.toLowerCase() === connectedAddress.toLowerCase()) {
      toast.error("You can't invite yourself");
      return;
    }

    const seconds = DURATIONS.find((d) => d.key === duration)?.seconds ?? 3600;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + seconds);

    setIsSigning(true);
    try {
      const signature = await signTypedDataAsync({
        domain: INVITE_PROOF_TYPED_DATA_DOMAIN,
        types: INVITE_PROOF_TYPES,
        primaryType: "InviteProof",
        message: { circleId: chainId, invitee, expiry },
      });

      const url = buildInviteUrl(
        { circleId, chainId, invitee, expiry, signature },
        window.location.origin,
      );
      setGenerated(url);
      toast.success("Invite link ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("User rejected") || message.includes("denied")) {
        toast("Signature cancelled");
      } else {
        toast.error("Failed to sign invite");
      }
    } finally {
      setIsSigning(false);
    }
  }

  async function handleCopy() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — long-press to copy manually");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
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
                  Generate invite link
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {circleName
                    ? `For "${circleName}". Only the address you pick can use the link.`
                    : "Only the address you pick can use the link."}
                </p>
              </div>
              {!isSigning && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-95"
                >
                  <HiXMark className="w-5 h-5 text-main-text" />
                </button>
              )}
            </div>

            <div className="px-6 pb-6 pt-2">
              {generated ? (
                <>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs text-muted mb-2 uppercase tracking-wide">
                      Shareable link
                    </p>
                    <p className="text-xs text-main-text break-all font-mono leading-relaxed">
                      {generated}
                    </p>
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleCopy}
                    whileTap={{ scale: 0.97 }}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 py-4 text-base font-semibold text-white cursor-pointer transition-all duration-200"
                  >
                    {copied ? (
                      <>
                        <HiOutlineCheck className="w-5 h-5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <HiOutlineClipboard className="w-5 h-5" />
                        Copy link
                      </>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={reset}
                    className="w-full mt-3 text-sm font-medium text-muted cursor-pointer text-center"
                  >
                    Generate another
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <label
                      htmlFor="invitee"
                      className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2"
                    >
                      Invitee wallet address
                    </label>
                    <input
                      id="invitee"
                      type="text"
                      value={inviteeAddr}
                      onChange={(e) => setInviteeAddr(e.target.value)}
                      placeholder="0x..."
                      disabled={isSigning}
                      className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                    />
                  </div>

                  <div className="mb-5">
                    <p className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                      Expires after
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {DURATIONS.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setDuration(d.key)}
                          disabled={isSigning}
                          className={`rounded-xl py-3 text-sm font-medium cursor-pointer transition-all duration-200 ${
                            duration === d.key
                              ? "bg-gray-900 text-white"
                              : "bg-gray-50 text-main-text"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isSigning}
                    whileTap={isSigning ? {} : { scale: 0.97 }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isSigning ? (
                      "Signing..."
                    ) : (
                      <>
                        <HiOutlineSparkles className="w-5 h-5" />
                        Sign & generate
                      </>
                    )}
                  </motion.button>

                  <p className="mt-3 text-xs text-muted text-center px-4">
                    No gas fee — this is an off-chain signature. The invitee
                    pays gas when joining.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
