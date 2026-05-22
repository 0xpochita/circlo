/**
 * circlo-sdk — High-level TypeScript SDK for Circlo on Celo Mainnet.
 *
 * Wraps viem with ergonomic helpers so you can interact with Circle, Goal,
 * Stake, and Claim flows without managing ABIs or contract addresses by hand.
 *
 * @example
 * ```ts
 * import { createCircloClient } from "circlo-sdk";
 * import { createWalletClient, http } from "viem";
 * import { privateKeyToAccount } from "viem/accounts";
 * import { celo } from "viem/chains";
 *
 * const account = privateKeyToAccount("0x...");
 * const wallet = createWalletClient({ account, chain: celo, transport: http() });
 *
 * const circlo = createCircloClient({ walletClient: wallet });
 *
 * const { hash, circleId } = await circlo.createCircle({
 *   name: "Gym Squad",
 *   privacy: "public",
 *   avatarEmoji: "💪",
 *   avatarColor: "#ef4444",
 * });
 * ```
 */

export { createCircloClient, type CircloClient, type CircloClientConfig } from "./client.js";

export {
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

export {
  createGoal,
  getGoal,
  getGoalNextId,
  lockGoal,
  type CreateGoalParams,
  type CreateGoalResult,
} from "./goals.js";

export {
  getPoolPerSide,
  getStakeOf,
  stake,
  type StakeParams,
  type StakeResult,
} from "./stakes.js";

export { claim, refund } from "./claims.js";

export { finalize, getTally, submitVote } from "./resolution.js";

export { settlement } from "./settlement.js";

export {
  watchCircleCreated,
  watchGoalCreated,
  watchStaked,
} from "./events.js";

export {
  buildCircleMetadata,
  buildGoalMetadata,
  type CircleMetadataInput,
  type GoalMetadataInput,
} from "./metadata.js";

/**
 * Re-export the metadata-decoding helpers from circlo-types so callers
 * can `import { parseCircleMetadata } from "circlo-sdk"` without also
 * needing to pull in circlo-types directly. The build* helpers above
 * round-trip with these.
 */
export {
  parseCircleMetadata,
  parseGoalMetadata,
  type CircleMetadata,
  type GoalMetadata,
} from "circlo-types";

export {
  CircloSdkError,
  NotConfiguredError,
  EventNotFoundError,
  TxRevertedError,
} from "./errors.js";
