"use client";

import Image from "next/image";
import { IS_MAINNET, NETWORK } from "@/lib/web3/network";

/**
 * Fixed-position pill in the bottom-right that surfaces which Celo
 * network the app is talking to. Green on Celo Mainnet, amber on
 * Celo Sepolia. Clicking it opens the active block explorer
 * homepage in a new tab.
 */
export default function NetworkBadge() {
  const tone = IS_MAINNET
    ? "bg-emerald-500"
    : "bg-amber-500";
  const label = IS_MAINNET ? "Celo Mainnet" : "Celo Sepolia";

  return (
    <a
      href={NETWORK.explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-2 right-2 z-50 select-none transition-opacity duration-200 hover:opacity-80"
      title={`Connected to ${NETWORK.name} — click to open block explorer`}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full ${tone} pl-1 pr-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md`}
      >
        <Image
          src="/Assets/Images/Logo/logo-coin/celo-logo.svg"
          alt=""
          width={14}
          height={14}
          className="rounded-full bg-white p-px"
        />
        {label}
      </span>
    </a>
  );
}
