import type { Address } from "viem";

/**
 * `true` when the frontend is wired to Celo Mainnet; `false` for
 * Celo Sepolia. Toggled by `NEXT_PUBLIC_USE_MAINNET=true` at build
 * time. Read from this constant (never `process.env` directly) so
 * the build inlines the boolean and dead-code elimination drops the
 * unused branch.
 */
export const IS_MAINNET = process.env.NEXT_PUBLIC_USE_MAINNET === "true";

/**
 * Per-network configuration bundle.
 *
 * Holds everything the frontend needs to talk to a single Celo
 * network: chain id, display name, RPC + explorer URLs, contract
 * address map, and the USDT decimal precision. One of these is
 * exported as `NETWORK` after the `IS_MAINNET` switch.
 *
 * `id` is intentionally narrowed to the two valid Celo chain ids so
 * misconfiguring the network at build time becomes a type error
 * instead of a runtime "wrong chain" prompt.
 */
type NetworkConfig = {
  id: 42220 | 11142220;
  name: string;
  shortName: "mainnet" | "testnet";
  rpcUrl: string;
  explorerUrl: string;
  contracts: {
    circleFactory: Address;
    predictionPool: Address;
    resolutionModule: Address;
    usdt: Address;
  };
  usdtDecimals: number;
};

const TESTNET: NetworkConfig = {
  id: 11142220,
  name: "Celo Sepolia",
  shortName: "testnet",
  rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
  explorerUrl: "https://celo-sepolia.blockscout.com",
  contracts: {
    circleFactory: (process.env.NEXT_PUBLIC_CIRCLE_FACTORY ||
      "0x0000000000000000000000000000000000000000") as Address,
    predictionPool: (process.env.NEXT_PUBLIC_PREDICTION_POOL ||
      "0x0000000000000000000000000000000000000000") as Address,
    resolutionModule: (process.env.NEXT_PUBLIC_RESOLUTION_MODULE ||
      "0x0000000000000000000000000000000000000000") as Address,
    usdt: (process.env.NEXT_PUBLIC_USDT ||
      "0x0000000000000000000000000000000000000000") as Address,
  },
  usdtDecimals: 6,
};

const MAINNET: NetworkConfig = {
  id: 42220,
  name: "Celo Mainnet",
  shortName: "mainnet",
  rpcUrl: "https://forno.celo.org",
  explorerUrl: "https://celoscan.io",
  contracts: {
    circleFactory: (process.env.NEXT_PUBLIC_CIRCLE_FACTORY ||
      "0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab") as Address,
    predictionPool: (process.env.NEXT_PUBLIC_PREDICTION_POOL ||
      "0xE9cFa67358476194414ae3306888FfeCb8f41139") as Address,
    resolutionModule: (process.env.NEXT_PUBLIC_RESOLUTION_MODULE ||
      "0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5") as Address,
    usdt: (process.env.NEXT_PUBLIC_USDT ||
      "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e") as Address,
  },
  usdtDecimals: 6,
};

/**
 * Active network bundle resolved at build time from `IS_MAINNET`.
 *
 * Use this everywhere instead of branching on `IS_MAINNET` at call
 * sites — the resolved object lets components stay network-agnostic
 * and switching networks is one config flip.
 */
export const NETWORK: NetworkConfig = IS_MAINNET ? MAINNET : TESTNET;

/**
 * The 20-byte zero address. Used as a placeholder for unconfigured
 * env-var contracts and as a "nobody" sentinel in some on-chain
 * reads. Never appears as a valid signer on Celo.
 */
export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as Address;

/**
 * Build a link to the active Celo block explorer (Celoscan for mainnet,
 * Blockscout for Sepolia) pointing at an address.
 */
export function explorerAddressUrl(address: Address | string): string {
  return `${NETWORK.explorerUrl}/address/${address}`;
}

/**
 * Build a link to the active Celo block explorer for a tx hash.
 */
export function explorerTxUrl(hash: `0x${string}` | string): string {
  return `${NETWORK.explorerUrl}/tx/${hash}`;
}

/**
 * Build a Celoscan link to a PredictionPool goal — opens the contract
 * read tab so users can inspect the goal struct directly.
 */
export function explorerGoalUrl(goalId: bigint | number | string): string {
  return `${NETWORK.explorerUrl}/address/${NETWORK.contracts.predictionPool}#readContract`;
}

if (typeof window !== "undefined") {
  const tag = IS_MAINNET ? "%cMAINNET" : "%cTESTNET";
  const style = IS_MAINNET
    ? "background:#10b981;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold"
    : "background:#f59e0b;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold";
  console.info(`Circlo running on ${tag}`, style, NETWORK.name);

  if (NETWORK.contracts.predictionPool === ZERO_ADDRESS) {
    console.error(
      `[Circlo] PredictionPool address not configured for ${NETWORK.shortName}. Set NEXT_PUBLIC_PREDICTION_POOL.`,
    );
  }
}
