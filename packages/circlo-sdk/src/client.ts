import type { PublicClient, WalletClient } from "viem";
import { CIRCLO_CONTRACTS, CELO_MAINNET_CHAIN_ID } from "circlo-types";

export type CircloClientConfig = {
  /**
   * viem WalletClient used for writes (createCircle, stake, claim, etc).
   * Optional — if omitted, the SDK only supports reads.
   */
  walletClient?: WalletClient;
  /**
   * viem PublicClient used for reads + event queries.
   * Optional — if omitted, the SDK uses `walletClient.extend(publicActions)`
   * which works for most cases.
   */
  publicClient?: PublicClient;
};

/**
 * The CircloClient is a thin facade around viem that knows the Circlo
 * contract addresses and ABIs. It exposes high-level methods like
 * `createCircle` / `createGoal` / `stake` / `claim`.
 *
 * Construct one per user session — it holds onto a WalletClient and
 * (optionally) a PublicClient for the duration of the session.
 */
export type CircloClient = {
  /** The deployed contract addresses (Celo Mainnet). */
  readonly contracts: typeof CIRCLO_CONTRACTS;
  /** Celo Mainnet chainId (42220). */
  readonly chainId: typeof CELO_MAINNET_CHAIN_ID;
  /** The wallet client used for writes (undefined if SDK is read-only). */
  readonly walletClient: WalletClient | undefined;
  /** The public client used for reads. */
  readonly publicClient: PublicClient | undefined;
};

export function createCircloClient(config: CircloClientConfig = {}): CircloClient {
  return {
    contracts: CIRCLO_CONTRACTS,
    chainId: CELO_MAINNET_CHAIN_ID,
    walletClient: config.walletClient,
    publicClient: config.publicClient,
  };
}
