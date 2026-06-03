/**
 * On-chain enum values used by Circlo's PredictionPool.
 * Numeric values match the Solidity enum positions exactly.
 */

/**
 * Outcome model for a goal.
 *
 * - `Binary` (0): yes/no with one winner — the only model implemented
 *   today; every other slot reverts on `createGoal`.
 * - `Multi` (1): reserved for multi-option outcomes (3+ choices).
 * - `Numeric` (2): reserved for scalar/range outcomes (e.g. "BTC price
 *   on Dec 31").
 *
 * Values match the on-chain `IPredictionPool.OutcomeType` enum slots
 * exactly — passing the JS enum directly to a viem ABI call works.
 */
export const OutcomeType = {
  Binary: 0,
  Multi: 1,
  Numeric: 2,
} as const;
export type OutcomeType = (typeof OutcomeType)[keyof typeof OutcomeType];

/**
 * Lifecycle states a goal can be in.
 *
 * Standard transitions on Celo Mainnet:
 *
 *     Open → Locked     via `lockGoal()` after `deadline`
 *     Locked → Resolving via first `submitVote()`
 *     Resolving → PaidOut via auto-finalize at quorum
 *     Resolving → Disputed if vote ties
 *
 * `Resolved` (3) is reserved and unused — current flow goes straight
 * from `Resolving` to `PaidOut`. UI / indexers can ignore that slot.
 *
 * `PaidOut` (5) is the terminal state for the happy path; winners
 * call `claim` and losers' positions become inactive. `Disputed` (4)
 * is the terminal state for tied votes; stakers call `refund` for
 * principal.
 */
export const GoalStatus = {
  Open: 0,
  Locked: 1,
  Resolving: 2,
  Resolved: 3,
  Disputed: 4,
  PaidOut: 5,
} as const;
export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

/** Stake side for binary outcomes. */
export const Side = {
  Yes: 0,
  No: 1,
} as const;
export type Side = (typeof Side)[keyof typeof Side];

/** UNRESOLVED sentinel value emitted while goal hasn't been finalized. */
export const UNRESOLVED_SIDE = 255 as const;
