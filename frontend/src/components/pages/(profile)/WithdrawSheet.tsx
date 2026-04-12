"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiXMark, HiOutlineShieldCheck, HiOutlineArrowRight } from "react-icons/hi2";

type WithdrawSheetProps = {
  open: boolean;
  onClose: () => void;
  balance: string;
};

const quickAmounts = ["25%", "50%", "75%", "Max"];

export default function WithdrawSheet({ open, onClose, balance }: WithdrawSheetProps) {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setAmount("");
      setAddress("");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleQuickAmount(label: string) {
    const balanceNum = parseFloat(balance);
    if (isNaN(balanceNum)) return;
    if (label === "Max") {
      setAmount(balance);
      return;
    }
    const pct = parseInt(label) / 100;
    setAmount((balanceNum * pct).toFixed(2));
  }

  const canWithdraw = parseFloat(amount) > 0 && address.trim().length > 0;

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
                <h2 className="text-xl font-bold text-main-text">Withdraw USDT</h2>
                <p className="mt-1 text-sm text-muted">Send USDT to an external wallet</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-[0.95]"
              >
                <HiXMark className="w-5 h-5 text-main-text" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
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

              <div className="mb-4 rounded-2xl bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted">Amount</p>
                  <p className="text-xs text-muted">Available: {balance} USDT</p>
                </div>
                <div className="flex items-center gap-2 mb-3 min-w-0">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0.00"
                    className="min-w-0 flex-1 bg-transparent text-2xl font-bold text-main-text placeholder:text-muted outline-none"
                  />
                  <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
                    <Image
                      src="/Assets/Images/Logo/logo-coin/usdt-logo.svg"
                      alt="USDT"
                      width={16}
                      height={16}
                    />
                    <span className="text-sm font-semibold text-main-text">USDT</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {quickAmounts.map((label) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => handleQuickAmount(label)}
                      className="flex-1 rounded-lg bg-white py-2 text-xs font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4 rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-muted mb-2">Destination address</p>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-transparent font-mono text-sm text-main-text placeholder:text-muted outline-none"
                />
              </div>

              <div className="mb-4 rounded-2xl bg-gray-50 p-4">
                <div className="flex items-center justify-between py-1">
                  <p className="text-xs text-muted">Network fee</p>
                  <p className="text-xs font-medium text-main-text">~0.001 USDT</p>
                </div>
                <div className="flex items-center justify-between py-1">
                  <p className="text-xs text-muted">Estimated arrival</p>
                  <p className="text-xs font-medium text-main-text">~15 seconds</p>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                  <p className="text-sm font-semibold text-main-text">You'll receive</p>
                  <p className="text-sm font-bold text-main-text">
                    {amount ? `${(parseFloat(amount) - 0.001).toFixed(3)} USDT` : "0.00 USDT"}
                  </p>
                </div>
              </div>

              <div className="mb-4 rounded-2xl bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
                    <HiOutlineShieldCheck className="w-5 h-5 text-main-text" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-main-text mb-1">
                      Double-check the address
                    </p>
                    <p className="text-xs text-muted">
                      Withdrawals are irreversible. Make sure the destination supports USDT on Celo.
                    </p>
                  </div>
                </div>
              </div>

              <motion.button
                type="button"
                disabled={!canWithdraw}
                whileTap={canWithdraw ? { scale: 0.97 } : {}}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-main-text py-4 text-base font-semibold text-white cursor-pointer transition-all duration-200 disabled:bg-gray-100 disabled:text-muted disabled:cursor-not-allowed"
              >
                Confirm Withdrawal
                <HiOutlineArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
