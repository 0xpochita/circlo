/**
 * High-level TypeScript shapes for Circlo entities.
 * These mirror what comes back from the on-chain views + indexer.
 */

import type { Address } from "./util.js";
import type { GoalStatus, OutcomeType } from "./enums.js";

/**
 * High-level shape of a circle as returned by `getCircleInfo` plus an
 * `id` field injected by the SDK / indexer.
 *
 * - `id`: sequential circle id assigned by `CircleFactory`.
 * - `owner`: address that originally called `createCircle`. Cannot
 *   leave the circle without transferring ownership first.
 * - `isPrivate`: `true` iff joining requires a signed `InviteProof`.
 * - `createdAt`: unix seconds when the circle was minted. Doubles as
 *   a "circle exists" sentinel — zero means never created.
 * - `metadataURI`: raw JSON blob; decode with `parseCircleMetadata`.
 */
export interface Circle {
  id: bigint;
  owner: Address;
  isPrivate: boolean;
  createdAt: bigint;
  metadataURI: string;
}

export interface CircleMetadata {
  name: string;
  description?: string;
  category?: string;
  avatarEmoji?: string;
  avatarColor?: string;
}

/**
 * Hydrated goal record assembled from the on-chain `goals(id)` view
 * plus the implicit `id` parameter.
 *
 * - `circleId`: parent circle. The creator must be a member of it.
 * - `creator`: address that called `createGoal`. May also appear as
 *   a resolver if `resolverList` included them.
 * - `outcomeType`: see `OutcomeType`. Only `Binary` is wired today.
 * - `status`: see `GoalStatus`. `Open` until deadline, then `Locked`
 *   on first `lockGoal` call.
 * - `deadline`: unix seconds after which `stake` reverts `GoalLocked`.
 * - `minStake`: per-call USDT minimum (6-decimal base units).
 * - `totalPool`: sum of all stakes across both sides at time of read.
 * - `winningSide`: `Side.Yes`/`Side.No` once `PaidOut`, otherwise
 *   `UNRESOLVED_SIDE` (255).
 * - `metadataURI`: raw JSON blob; decode with `parseGoalMetadata`.
 */
export interface Goal {
  id: bigint;
  circleId: bigint;
  creator: Address;
  outcomeType: OutcomeType;
  status: GoalStatus;
  deadline: bigint;
  minStake: bigint;
  totalPool: bigint;
  /** 255 (UNRESOLVED_SIDE) until finalized. */
  winningSide: number;
  metadataURI: string;
}

export interface GoalMetadata {
  title: string;
  description?: string;
  /** Format: "emoji|#hexcolor" (e.g. "🎯|#ec4899"). */
  avatar?: string;
}

export interface Stake {
  goalId: bigint;
  user: Address;
  side: number;
  amount: bigint;
}

export interface ResolverVote {
  goalId: bigint;
  resolver: Address;
  choice: number;
}

export interface CircleCreatedEvent {
  id: bigint;
  owner: Address;
  isPrivate: boolean;
  metadataURI: string;
}

export interface GoalCreatedEvent {
  id: bigint;
  circleId: bigint;
  creator: Address;
  outcomeType: number;
  deadline: bigint;
  minStake: bigint;
  resolverList: readonly Address[];
  metadataURI: string;
}

export interface StakedEvent {
  goalId: bigint;
  user: Address;
  side: number;
  amount: bigint;
}

export interface ClaimedEvent {
  goalId: bigint;
  user: Address;
  amount: bigint;
}
