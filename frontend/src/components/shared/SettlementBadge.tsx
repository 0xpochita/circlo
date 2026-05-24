"use client";

import { useEffect, useState } from "react";
import { HiOutlineSignal } from "react-icons/hi2";
import { usePublicClient } from "wagmi";
import { predictionPoolContract } from "@/lib/web3/contracts";
import { explorerTxUrl } from "@/lib/web3/network";

/**
 * Compact pill showing the most recent PredictionPool.Settlement()
 * heartbeat — "Heartbeat: 5m ago" — clickable to open the latest
 * Settlement event tx on the active Celo block explorer.
 *
 * Backfills the latest event on mount (scans recent blocks) and
 * subscribes to live logs while mounted.
 */
export default function SettlementBadge() {
  const publicClient = usePublicClient();
  const [latest, setLatest] = useState<{
    timestamp: bigint;
    txHash: `0x${string}`;
  } | null>(null);

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    const settlementEvent = (
      predictionPoolContract.abi as readonly { type: string; name?: string }[]
    ).find((x) => x.type === "event" && x.name === "Settlement");
    if (!settlementEvent) return;

    async function backfill() {
      if (!publicClient) return;
      try {
        const latestBlock = await publicClient.getBlockNumber();
        // Scan roughly the last ~5 minutes worth of Celo blocks (5s/block ≈ 60 blocks).
        const span = BigInt(120);
        const fromBlock = latestBlock > span ? latestBlock - span : BigInt(0);
        const logs = await publicClient.getLogs({
          address: predictionPoolContract.address,
          // biome-ignore lint/suspicious/noExplicitAny: viem getLogs event typing is too narrow here
          event: settlementEvent as any,
          fromBlock,
          toBlock: latestBlock,
        });
        if (cancelled || logs.length === 0) return;
        const last = logs[logs.length - 1] as unknown as {
          args: { timestamp: bigint };
          transactionHash: `0x${string}`;
        };
        setLatest({
          timestamp: last.args.timestamp,
          txHash: last.transactionHash,
        });
      } catch {
        /* RPC hiccup is non-fatal — leave the badge in idle state */
      }
    }

    backfill();

    const unwatch = publicClient.watchEvent({
      address: predictionPoolContract.address,
      // biome-ignore lint/suspicious/noExplicitAny: viem watchEvent event typing is too narrow here
      event: settlementEvent as any,
      onLogs: (logs) => {
        if (cancelled || logs.length === 0) return;
        const last = logs[logs.length - 1] as unknown as {
          args: { timestamp: bigint };
          transactionHash: `0x${string}`;
        };
        setLatest({
          timestamp: last.args.timestamp,
          txHash: last.transactionHash,
        });
      },
    });

    return () => {
      cancelled = true;
      unwatch();
    };
  }, [publicClient]);

  if (!latest) return null;

  const ageSeconds = Math.max(
    0,
    Math.floor(Date.now() / 1000) - Number(latest.timestamp),
  );
  const label =
    ageSeconds < 60
      ? `${ageSeconds}s ago`
      : ageSeconds < 3600
        ? `${Math.floor(ageSeconds / 60)}m ago`
        : `${Math.floor(ageSeconds / 3600)}h ago`;

  return (
    <a
      href={explorerTxUrl(latest.txHash)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 transition-colors duration-150 hover:bg-emerald-100"
      title="Last on-chain settlement heartbeat (click to view tx on Celo explorer)"
    >
      <HiOutlineSignal className="w-3 h-3" />
      Heartbeat: {label}
    </a>
  );
}
