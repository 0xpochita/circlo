import { createPublicClient, http, type PublicClient } from "viem";
import { celo, celoSepolia } from "viem/chains";
import { config } from "../config.js";

/**
 * Singleton viem PublicClient pointed at Celo Mainnet.
 *
 * Used by the indexer and read-only API routes that need to peek at
 * on-chain state (e.g. resolving the canonical winning side for a
 * goal).
 */
export const celoClient: PublicClient = createPublicClient({
  chain: celo,
  transport: http(config.celoRpcUrl),
});

/**
 * Singleton viem PublicClient pointed at Celo Sepolia (testnet).
 * Useful for staging deployments that talk to a parallel set of
 * Circlo contracts during dev.
 */
export const celoSepoliaClient: PublicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(config.celoRpcUrlTestnet),
});

/**
 * Pick the right PublicClient for a chain id.
 *
 * Defaults to Mainnet — both for missing-chainId callers and any
 * unrecognized id. Adding a new chain means extending the dispatch
 * here AND defining the matching `_RpcUrl*` / `_ChainId*` config
 * keys.
 */
export function getPublicClient(chainId?: number): PublicClient {
  if (chainId === config.celoChainIdTestnet) return celoSepoliaClient;
  return celoClient;
}

export default celoClient;
