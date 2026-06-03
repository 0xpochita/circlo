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

/**
 * Decoded payload of `Circle.metadataURI` after `parseCircleMetadata`.
 *
 * Optional fields are exactly the ones `buildCircleMetadata` omits
 * when their input was empty — the round-trip is:
 *
 *     CircleMetadataInput → buildCircleMetadata (sdk) → metadataURI →
 *     parseCircleMetadata (types) → CircleMetadata
 *
 * Fields:
 * - `name`: display name shown on the circle card.
 * - `description`: optional longer copy on the detail page.
 * - `category`: free-form tag (e.g. "fitness", "crypto").
 * - `avatarEmoji`: single emoji rendered as the circle badge.
 * - `avatarColor`: hex string for the badge background.
 */
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

/**
 * A single per-call stake record.
 *
 * Note this is the *per-call* event payload, not a cumulative
 * position — a wallet that stakes 10 USDT then 5 USDT on YES has two
 * `Stake` entries, summing to 15 USDT. Use the on-chain `stakeOf`
 * view (or the SDK `getStakeOf` helper) for the cumulative figure.
 */
export interface Stake {
  goalId: bigint;
  user: Address;
  side: number;
  amount: bigint;
}

/**
 * A single resolver vote record.
 *
 * Resolvers are immutable per-goal (set at `createGoal`), and each
 * may only vote once. `choice` mirrors `Side` (0/1) — there is no
 * abstain path; failing to vote within the window just keeps the
 * goal in `Resolving` until the window closes.
 */
export interface ResolverVote {
  goalId: bigint;
  resolver: Address;
  choice: number;
}

/**
 * Decoded shape of `CircleCreated` events from the CircleFactory.
 * `id` is the indexed circle id; the rest of the fields come from
 * the event data section.
 */
export interface CircleCreatedEvent {
  id: bigint;
  owner: Address;
  isPrivate: boolean;
  metadataURI: string;
}

/**
 * Decoded shape of `GoalCreated` events from the PredictionPool.
 *
 * All the constructor inputs (`circleId`, `outcomeType`, `deadline`,
 * `minStake`, `resolverList`, `metadataURI`) are mirrored in the
 * event so indexers can backfill the goal record from a single log
 * read without a separate `getGoal` round trip.
 */
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

/**
 * Decoded shape of `Staked` events from the PredictionPool.
 *
 * Fires once per `stake()` call — see the `Stake` type for the
 * per-call vs cumulative semantics.
 */
export interface StakedEvent {
  goalId: bigint;
  user: Address;
  side: number;
  amount: bigint;
}

/**
 * Decoded shape of `Claimed` events from the PredictionPool.
 *
 * `amount` is the **post-fee** USDT payout transferred to `user` —
 * pair with `Goal.totalPool` if you need to derive the implied fee.
 */
export interface ClaimedEvent {
  goalId: bigint;
  user: Address;
  amount: bigint;
}
