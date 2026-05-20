import { HiArrowTopRightOnSquare } from "react-icons/hi2";
import {
  explorerAddressUrl,
  explorerGoalUrl,
  explorerTxUrl,
} from "@/lib/web3/network";

type OnChainBadgeProps =
  | { kind: "goal"; chainId: string | number | bigint }
  | { kind: "address"; address: string }
  | { kind: "tx"; hash: string };

/**
 * Compact pill that signals "this entity is live on Celo" and links
 * out to the appropriate Celo block explorer page (goal struct, wallet
 * address, or tx hash). Stops click propagation so it can sit safely
 * inside other clickable cards.
 */
export default function OnChainBadge(props: OnChainBadgeProps) {
  let href: string;
  if (props.kind === "goal") href = explorerGoalUrl(props.chainId);
  else if (props.kind === "address") href = explorerAddressUrl(props.address);
  else href = explorerTxUrl(props.hash);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-600 transition-colors duration-150 hover:bg-emerald-100"
      title="View on Celo block explorer"
    >
      On-chain
      <HiArrowTopRightOnSquare className="w-2.5 h-2.5" />
    </a>
  );
}
