import type { Address, PublicClient, WalletClient } from "viem";
import { CIRCLO_CONTRACTS, CELO_MAINNET_CHAIN_ID } from "circlo-types";
import {
  createCircle,
  isCircleMember,
  type CreateCircleParams,
  type CreateCircleResult,
} from "./circles.js";

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

  /** Create a new circle. Requires a configured walletClient. */
  createCircle(params: CreateCircleParams): Promise<CreateCircleResult>;
  /** Check if an address is a member of a circle. */
  isCircleMember(circleId: bigint, user: Address): Promise<boolean>;
};

export function createCircloClient(config: CircloClientConfig = {}): CircloClient {
  const requireWallet = (op: string): WalletClient => {
    if (!config.walletClient) {
      throw new Error(`${op}: CircloClient was created without a walletClient — pass one to createCircloClient(...) to send writes`);
    }
    return config.walletClient;
  };

  const requirePublic = (op: string): PublicClient => {
    if (config.publicClient) return config.publicClient;
    throw new Error(`${op}: CircloClient was created without a publicClient and the read path needs one`);
  };

  return {
    contracts: CIRCLO_CONTRACTS,
    chainId: CELO_MAINNET_CHAIN_ID,
    walletClient: config.walletClient,
    publicClient: config.publicClient,

    createCircle: (params) =>
      createCircle(requireWallet("createCircle"), params, config.publicClient),
    isCircleMember: (circleId, user) =>
      isCircleMember(requirePublic("isCircleMember"), circleId, user),
  };
}
