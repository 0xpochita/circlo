/**
 * circlo-types — TypeScript types, ABIs, and contract addresses for Circlo.
 *
 * Circlo is a social prediction game on Celo Mainnet where friends bet
 * USDT on each other's goals. See https://circlo-nine.vercel.app.
 *
 * @example
 * ```ts
 * import { createPublicClient, http } from "viem";
 * import { celo } from "viem/chains";
 * import { CIRCLO_CONTRACTS, CIRCLE_FACTORY_ABI } from "circlo-types";
 *
 * const client = createPublicClient({ chain: celo, transport: http() });
 *
 * const nextId = await client.readContract({
 *   address: CIRCLO_CONTRACTS.CircleFactory,
 *   abi: CIRCLE_FACTORY_ABI,
 *   functionName: "nextCircleId",
 * });
 * ```
 */

export {
  CIRCLO_CONTRACTS,
  CELO_MAINNET_CHAIN_ID,
  type CircloContract,
} from "./contracts.js";

export {
  CIRCLE_FACTORY_ABI,
  PREDICTION_POOL_ABI,
  RESOLUTION_MODULE_ABI,
  ERC20_MINIMAL_ABI,
} from "./abis.js";

export {
  OutcomeType,
  GoalStatus,
  Side,
  UNRESOLVED_SIDE,
} from "./enums.js";

export type {
  Address,
} from "./util.js";

export {
  parseCircleMetadata,
  parseGoalMetadata,
} from "./util.js";

export type {
  Circle,
  CircleMetadata,
  Goal,
  GoalMetadata,
  Stake,
  ResolverVote,
  CircleCreatedEvent,
  GoalCreatedEvent,
  StakedEvent,
  ClaimedEvent,
} from "./types.js";
