import type { Address, PublicClient, WalletClient } from "viem";
import { CIRCLO_CONTRACTS, CELO_MAINNET_CHAIN_ID } from "circlo-types";
import {
  createCircle,
  getCircleInfo,
  getCircleMembers,
  getCircleNextId,
  isCircleMember,
  joinCircle,
  joinPrivateCircle,
  leaveCircle,
  type CircleInfo,
  type CreateCircleParams,
  type CreateCircleResult,
} from "./circles.js";
import {
  createGoal,
  getGoal,
  getGoalNextId,
  lockGoal,
  type CreateGoalParams,
  type CreateGoalResult,
} from "./goals.js";
import {
  getPoolPerSide,
  getStakeOf,
  stake,
  type StakeParams,
  type StakeResult,
} from "./stakes.js";
import { claim, refund } from "./claims.js";
import { finalize, submitVote, getTally } from "./resolution.js";
import { NotConfiguredError } from "./errors.js";
import type { Side } from "circlo-types";

/**
 * Configuration for `createCircloClient`. Both fields are optional but
 * at least one must be provided — a client with neither would fail
 * with `NotConfiguredError` on every method call.
 *
 * Typical wagmi wiring:
 *
 * ```ts
 * import { useWalletClient, usePublicClient } from "wagmi";
 *
 * const { data: walletClient } = useWalletClient();
 * const publicClient = usePublicClient();
 * const circlo = useMemo(
 *   () => createCircloClient({ walletClient, publicClient }),
 *   [walletClient, publicClient]
 * );
 * ```
 */
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
 *
 * **Read-only mode:** pass only `publicClient` (no `walletClient`).
 * Every write method (`createCircle`, `stake`, `claim`, etc.) then
 * throws `NotConfiguredError("opName", "walletClient")` so the UI
 * can prompt the user to connect a wallet.
 *
 * **Wallet-only mode:** pass only `walletClient` — reads route through
 * `walletClient.extend(publicActions)` automatically, so most apps
 * don't need to construct a separate publicClient.
 *
 * @example
 * ```ts
 * import { createCircloClient } from "circlo-sdk";
 *
 * // Wallet-only (writes + reads via wallet client)
 * const circlo = createCircloClient({ walletClient: wagmiWalletClient });
 *
 * const { circleId } = await circlo.createCircle({
 *   name: "Gym Squad", privacy: "public",
 * });
 * ```
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
  /** Join a public circle. Returns the tx hash. */
  joinCircle(circleId: bigint): Promise<`0x${string}`>;
  /** Join a private circle with a signed inviteProof. */
  joinPrivateCircle(circleId: bigint, inviteProof: `0x${string}`): Promise<`0x${string}`>;
  /** Leave a circle the caller is a member of. */
  leaveCircle(circleId: bigint): Promise<`0x${string}`>;
  /** Check if an address is a member of a circle. */
  isCircleMember(circleId: bigint, user: Address): Promise<boolean>;
  /** Read a paginated list of circle members. */
  getCircleMembers(circleId: bigint, offset?: bigint, limit?: bigint): Promise<readonly Address[]>;
  /** Read the id that the next-created circle will receive. */
  getCircleNextId(): Promise<bigint>;
  /** Read on-chain info for a circle: owner, privacy, createdAt, metadataURI. */
  getCircleInfo(circleId: bigint): Promise<CircleInfo>;

  /** Create a goal inside a circle. Requires a configured walletClient. */
  createGoal(params: CreateGoalParams): Promise<CreateGoalResult>;
  /** Lock a goal after its deadline so resolvers can vote. */
  lockGoal(goalId: bigint): Promise<`0x${string}`>;
  /** Read the full goal tuple from the PredictionPool contract. */
  getGoal(goalId: bigint): ReturnType<typeof getGoal>;
  /** Read the id that the next-created goal will receive. */
  getGoalNextId(): Promise<bigint>;

  /**
   * Stake USDT on a goal. Handles USDT approval automatically (unless
   * autoApprove is false). Waits for both approve + stake receipts.
   */
  stake(params: StakeParams): Promise<StakeResult>;
  /** Read a user's stake on a given side. */
  getStakeOf(goalId: bigint, user: Address, side: Side): Promise<bigint>;
  /** Read the total pool on a given side of a goal. */
  getPoolPerSide(goalId: bigint, side: Side): Promise<bigint>;

  /** Claim a winning payout from a resolved goal. */
  claim(goalId: bigint): Promise<`0x${string}`>;
  /** Refund a stake when a goal was cancelled / unresolvable. */
  refund(goalId: bigint): Promise<`0x${string}`>;

  /** Submit a resolver vote (0 = NO, 1 = YES). Auto-finalizes at quorum. */
  submitVote(goalId: bigint, choice: 0 | 1): Promise<`0x${string}`>;
  /** Force-finalize a goal whose tally reached quorum without auto-finalize. */
  finalize(goalId: bigint): Promise<`0x${string}`>;
  /** Read the current resolver vote tally on a goal. */
  getTally(goalId: bigint): Promise<{ counts: readonly bigint[]; total: bigint }>;
};

/**
 * Construct a `CircloClient` from a wagmi / viem config.
 *
 * The returned client lazily checks for the required client (wallet
 * vs public) on each method call — there's no startup cost to passing
 * just a publicClient, and every write method throws
 * `NotConfiguredError` if the wallet was missing.
 *
 * @param config Either or both of `walletClient` and `publicClient`.
 * @returns A typed client with high-level methods for every Circlo
 *   contract action plus read methods backed by the public client.
 *
 * @example
 * ```ts
 * const circlo = createCircloClient({
 *   walletClient,
 *   publicClient,
 * });
 *
 * // Throws NotConfiguredError("createCircle", "walletClient") if no wallet:
 * await circlo.createCircle({ name: "Gym", privacy: "public" });
 * ```
 */
export function createCircloClient(config: CircloClientConfig = {}): CircloClient {
  const requireWallet = (op: string): WalletClient => {
    if (!config.walletClient) {
      throw new NotConfiguredError(op, "walletClient");
    }
    return config.walletClient;
  };

  const requirePublic = (op: string): PublicClient => {
    if (config.publicClient) return config.publicClient;
    throw new NotConfiguredError(op, "publicClient");
  };

  return {
    contracts: CIRCLO_CONTRACTS,
    chainId: CELO_MAINNET_CHAIN_ID,
    walletClient: config.walletClient,
    publicClient: config.publicClient,

    createCircle: async (params) =>
      createCircle(requireWallet("createCircle"), params, config.publicClient),
    joinCircle: async (circleId) =>
      joinCircle(requireWallet("joinCircle"), circleId),
    joinPrivateCircle: async (circleId, inviteProof) =>
      joinPrivateCircle(requireWallet("joinPrivateCircle"), circleId, inviteProof),
    leaveCircle: async (circleId) =>
      leaveCircle(requireWallet("leaveCircle"), circleId),
    isCircleMember: async (circleId, user) =>
      isCircleMember(requirePublic("isCircleMember"), circleId, user),
    getCircleMembers: async (circleId, offset, limit) =>
      getCircleMembers(requirePublic("getCircleMembers"), circleId, offset, limit),
    getCircleNextId: async () =>
      getCircleNextId(requirePublic("getCircleNextId")),
    getCircleInfo: async (circleId) =>
      getCircleInfo(requirePublic("getCircleInfo"), circleId),

    createGoal: async (params) =>
      createGoal(requireWallet("createGoal"), params, config.publicClient),
    lockGoal: async (goalId) =>
      lockGoal(requireWallet("lockGoal"), goalId),
    getGoal: async (goalId) =>
      getGoal(requirePublic("getGoal"), goalId),
    getGoalNextId: async () =>
      getGoalNextId(requirePublic("getGoalNextId")),

    stake: async (params) =>
      stake(requireWallet("stake"), params, config.publicClient),
    getStakeOf: async (goalId, user, side) =>
      getStakeOf(requirePublic("getStakeOf"), goalId, user, side),
    getPoolPerSide: async (goalId, side) =>
      getPoolPerSide(requirePublic("getPoolPerSide"), goalId, side),

    claim: async (goalId) => claim(requireWallet("claim"), goalId),
    refund: async (goalId) => refund(requireWallet("refund"), goalId),

    submitVote: async (goalId, choice) =>
      submitVote(requireWallet("submitVote"), goalId, choice),
    finalize: async (goalId) =>
      finalize(requireWallet("finalize"), goalId),
    getTally: async (goalId) =>
      getTally(requirePublic("getTally"), goalId),
  };
}
