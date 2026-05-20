import { explorerAddressUrl } from "@/lib/web3/network";

type AddressLinkProps = {
  address: string;
  /** First N chars to display when `withTail` is false. Defaults to 10. */
  length?: number;
  /** Render in `0x1234...abcd` format instead of head-only. */
  withTail?: boolean;
  className?: string;
  /** Set true when the link sits inside a clickable parent (card, row). */
  stopPropagation?: boolean;
};

/**
 * Shortened wallet address rendered as an anchor to the active Celo
 * block explorer (Celoscan on Celo Mainnet, Blockscout on Celo Sepolia).
 */
export default function AddressLink({
  address,
  length = 10,
  withTail = false,
  className = "hover:underline",
  stopPropagation = false,
}: AddressLinkProps) {
  const display = withTail
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address.slice(0, length);

  return (
    <a
      href={explorerAddressUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      {display}
    </a>
  );
}
