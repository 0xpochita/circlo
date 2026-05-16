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
  getCircleMembers,
  getCircleNextId,
  isCircleMember,
  joinCircle,
  joinPrivateCircle,
  leaveCircle,
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
