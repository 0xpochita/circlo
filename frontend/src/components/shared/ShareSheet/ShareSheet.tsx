"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  HiCheck,
  HiOutlineDocumentDuplicate,
  HiOutlineLink,
  HiXMark,
} from "react-icons/hi2";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { EmojiAvatar } from "@/components/shared";
import { useSheetOverflow } from "@/hooks";
import { toAvatar } from "@/lib/utils";

type ShareSheetProps = {
  open: boolean;
  onClose: () => void;
  circleName: string;
  circleId: string;
  inviteCode?: string | null;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
};

export default function ShareSheet({
  open,
  onClose,
  circleName,
  circleId,
  inviteCode,
  avatarEmoji,
  avatarColor,
}: ShareSheetProps) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/circle-details?id=${circleId}`
      : "";

  useSheetOverflow(open);

  useEffect(() => {
    if (!open) setCopied(null);
  }, [open]);

  async function handleCopy(text: string, type: "link" | "code") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast("Copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${circleName} on Circlo`,
          text: inviteCode
            ? `Join my circle "${circleName}" on Circlo! Use invite code: ${inviteCode}`
            : `Join my circle "${circleName}" on Circlo!`,
          url: shareUrl,
        });
      } catch {}
    } else {
      handleCopy(shareUrl, "link");
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
            onClick={onClose}
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
            className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 flex flex-col rounded-t-3xl bg-white"
            style={{ maxHeight: "85dvh" }}
          >
            <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-main-text">
                  Share Circle
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Invite friends to join {circleName}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-[0.95]"
              >
                <HiXMark className="w-5 h-5 text-main-text" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8">
              <div className="flex flex-col items-center mb-5">
                <EmojiAvatar
                  avatar={toAvatar(avatarEmoji, avatarColor)}
                  size={64}
                  shape="square"
                />
                <p className="mt-2 text-base font-semibold text-main-text">
                  {circleName}
                </p>
              </div>

              <div className="flex justify-center mb-5">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <QRCode
                    value={shareUrl || "https://circlo.app"}
                    size={160}
                    bgColor="transparent"
                    fgColor="#1a1a1a"
                    viewBox="0 0 160 160"
                  />
                </div>
              </div>

              {inviteCode && (
                <div className="mb-4 rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs text-muted mb-1">Invite code</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-main-text tracking-wider">
                      {inviteCode}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopy(inviteCode, "code")}
                      className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
                    >
                      {copied === "code" ? (
                        <>
                          <HiCheck className="w-4 h-4" /> Copied
                        </>
                      ) : (
                        <>
                          <HiOutlineDocumentDuplicate className="w-4 h-4" />{" "}
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-4 rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-muted mb-1">Share link</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-main-text truncate flex-1">
                    {shareUrl}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopy(shareUrl, "link")}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
                  >
                    {copied === "link" ? (
                      <>
                        <HiCheck className="w-4 h-4" /> Copied
                      </>
                    ) : (
                      <>
                        <HiOutlineLink className="w-4 h-4" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <motion.button
                type="button"
                onClick={handleNativeShare}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer"
              >
                Share with friends
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
