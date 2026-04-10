"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";
import { HiXMark, HiOutlineDocumentDuplicate, HiCheck, HiOutlineShieldCheck } from "react-icons/hi2";

const MOCK_WALLET_ADDRESS = "0x3fd29ab7c5a0c4b0e2f1c8b9d7a6e5f4c3b2a1d0";

type DepositSheetProps = {
  open: boolean;
  onClose: () => void;
};

export default function DepositSheet({ open, onClose }: DepositSheetProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setCopied(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(MOCK_WALLET_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const shortAddress = `${MOCK_WALLET_ADDRESS.slice(0, 6)}...${MOCK_WALLET_ADDRESS.slice(-4)}`;

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
            transition={{ type: "spring" as const, stiffness: 300, damping: 32 }}
            className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 flex flex-col rounded-t-3xl bg-white"
            style={{ maxHeight: "90dvh" }}
          >
            <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-main-text">Deposit USDT</h2>
                <p className="mt-1 text-sm text-muted">Send USDT to this address on Celo</p>
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
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2">
                  <Image
                    src="/Assets/Images/Logo/logo-coin/usdt-logo.svg"
                    alt="USDT"
                    width={20}
                    height={20}
                  />
                  <span className="text-sm font-semibold text-main-text">USDT</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2">
                  <Image
                    src="/Assets/Images/Logo/logo-coin/celo-logo.svg"
                    alt="Celo"
                    width={20}
                    height={20}
                  />
                  <span className="text-sm font-semibold text-main-text">Celo Mainnet</span>
                </div>
              </div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring" as const, stiffness: 300, damping: 22 }}
                className="mx-auto mb-5 flex items-center justify-center rounded-3xl bg-white p-5"
                style={{ width: 232 }}
              >
                <div className="rounded-2xl bg-gray-50 p-4">
                  <QRCode
                    value={MOCK_WALLET_ADDRESS}
                    size={168}
                    bgColor="transparent"
                    fgColor="#1a1a1a"
                    viewBox="0 0 168 168"
                  />
                </div>
              </motion.div>

              <div className="mb-4 rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-muted mb-1">Your wallet address</p>
                <p className="text-sm font-mono font-semibold text-main-text break-all">
                  {MOCK_WALLET_ADDRESS}
                </p>
                <p className="mt-1 text-xs text-muted">{shortAddress}</p>
              </div>

              <motion.button
                type="button"
                onClick={handleCopy}
                whileTap={{ scale: 0.97 }}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-main-text py-4 text-base font-semibold text-white cursor-pointer"
              >
                {copied ? (
                  <>
                    <HiCheck className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <HiOutlineDocumentDuplicate className="w-5 h-5" />
                    Copy address
                  </>
                )}
              </motion.button>

              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
                    <HiOutlineShieldCheck className="w-5 h-5 text-main-text" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-main-text mb-1">
                      Only send USDT on Celo
                    </p>
                    <p className="text-xs text-muted">
                      Sending any other token or using a different network will result in permanent loss of funds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
