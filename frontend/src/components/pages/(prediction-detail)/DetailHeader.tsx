"use client";

import { useState } from "react";
import { HiChevronLeft, HiOutlineShare, HiXMark, HiOutlineLink, HiCheck } from "react-icons/hi2";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type DetailHeaderProps = {
  goalId?: string;
  title?: string;
};

export default function DetailHeader({ goalId, title }: DetailHeaderProps) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const shareUrl = goalId ? `${baseUrl}/prediction-detail?id=${goalId}` : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Prediction on Circlo",
          text: `Check out this prediction on Circlo!`,
          url: shareUrl,
        });
      } catch {}
    } else {
      handleCopy();
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-14 pb-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-95"
        >
          <HiChevronLeft className="w-5 h-5 text-main-text" />
        </button>
        <p className="text-base font-semibold text-main-text">Prediction Details</p>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-95"
        >
          <HiOutlineShare className="w-5 h-5 text-main-text" />
        </button>
      </div>

      <AnimatePresence>
        {shareOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShareOpen(false)}
              className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 rounded-t-3xl bg-white"
            >
              <div className="flex items-start justify-between px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-main-text">Share Prediction</h2>
                  <p className="mt-1 text-sm text-muted">Invite friends to join this prediction</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-95"
                >
                  <HiXMark className="w-5 h-5 text-main-text" />
                </button>
              </div>

              <div className="px-6 pb-8">
                <div className="mb-4 rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs text-muted mb-1">Share link</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-main-text truncate flex-1">{shareUrl}</p>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-95"
                    >
                      {copied ? (
                        <><HiCheck className="w-4 h-4" /> Copied</>
                      ) : (
                        <><HiOutlineLink className="w-4 h-4" /> Copy</>
                      )}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={handleNativeShare}
                  whileTap={{ scale: 0.97 }}
                  className="w-full rounded-full bg-gray-900 py-4 text-base font-semibold text-white cursor-pointer"
                >
                  Share with friends
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
