"use client";

import { IS_MAINNET, NETWORK } from "@/lib/web3/network";

export default function NetworkBadge() {
  if (IS_MAINNET) return null;

  return (
    <div className="fixed bottom-2 right-2 z-50 pointer-events-none select-none">
      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-md">
        {NETWORK.shortName}
      </span>
    </div>
  );
}
