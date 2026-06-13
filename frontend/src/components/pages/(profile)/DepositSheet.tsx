"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  HiArrowTopRightOnSquare,
  HiCheck,
  HiOutlineDocumentDuplicate,
  HiOutlineShieldCheck,
  HiXMark,
} from "react-icons/hi2";
import QRCode from "react-qr-code";
import { explorerAddressUrl } from "@/lib/web3/network";

const QR_SIZE = 168;
const COPIED_TIMEOUT_MS = 2000;
const ADDR_PREFIX_LEN = 6;
const ADDR_SUFFIX_LEN = 4;
const SHEET_MAX_HEIGHT = "90dvh";
const TAP_SCALE = 0.97;
const COIN_LOGO_SIZE = 20;
const SHEET_SPRING_STIFFNESS = 300;
const SHEET_SPRING_DAMPING = 32;
const QR_SPRING_DAMPING = 22;
const QR_CONTAINER_SIZE = 232;

type DepositSheetProps = {
  open: boolean;
  onClose: () => void;
  walletAddress: string;
};

export default function DepositSheet({
  open,
  onClose,
  walletAddress,
}: DepositSheetProps) {
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
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_TIMEOUT_MS);
    } catch {
      setCopied(false);
    }
  }

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, ADDR_PREFIX_LEN)}...${walletAddress.slice(-ADDR_SUFFIX_LEN)}`
    : "";

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
              stiffness: SHEET_SPRING_STIFFNESS,
              damping: SHEET_SPRING_DAMPING,
            }}
            className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 flex flex-col rounded-t-3xl bg-white"
            style={{ maxHeight: SHEET_MAX_HEIGHT }}
          >
            <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-main-text">
                  Deposit USDT
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Send USDT to this address on Celo
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
              {!walletAddress ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm font-medium text-muted">
                    Connect your wallet first
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 mb-5">
                    <div className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2">
                      <Image
                        src="/Assets/Images/Logo/logo-coin/usdt-logo.svg"
                        alt="USDT"
                        width={COIN_LOGO_SIZE}
                        height={COIN_LOGO_SIZE}
                      />
                      <span className="text-sm font-semibold text-main-text">
                        USDT
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2">
                      <Image
                        src="/Assets/Images/Logo/logo-coin/celo-logo.svg"
                        alt="Celo"
                        width={COIN_LOGO_SIZE}
                        height={COIN_LOGO_SIZE}
                      />
                      <span className="text-sm font-semibold text-main-text">
                        Celo Mainnet
                      </span>
                    </div>
                  </div>

                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring" as const,
                      stiffness: SHEET_SPRING_STIFFNESS,
                      damping: QR_SPRING_DAMPING,
                    }}
                    className="mx-auto mb-5 flex items-center justify-center rounded-3xl bg-white p-5"
                    style={{ width: QR_CONTAINER_SIZE }}
                  >
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <QRCode
                        value={walletAddress}
                        size={QR_SIZE}
                        bgColor="transparent"
                        fgColor="#1a1a1a"
                        viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
                      />
                    </div>
                  </motion.div>

                  <div className="mb-4 rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs text-muted mb-1">
                      Your wallet address
                    </p>
                    <p className="text-sm font-mono font-semibold text-main-text break-all">
                      {walletAddress}
                    </p>
                    <p className="mt-1 text-xs text-muted">{shortAddress}</p>
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleCopy}
                    whileTap={{ scale: TAP_SCALE }}
                    className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-main-text py-4 text-base font-semibold text-white cursor-pointer"
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

                  <a
                    href={explorerAddressUrl(walletAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-4 flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 py-3 text-sm font-semibold text-main-text transition-all duration-200 active:scale-[0.97]"
                  >
                    <HiArrowTopRightOnSquare className="w-4 h-4" />
                    View on Celo explorer
                  </a>

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
                          Sending any other token or using a different network
                          will result in permanent loss of funds.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
