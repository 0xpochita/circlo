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

/**
 * Stake side for binary outcomes.
 *
 * - `Yes` (0) — bets the goal resolves to TRUE
 * - `No`  (1) — bets the goal resolves to FALSE
 *
 * The numeric values are passed through to `stake(side, amount)` and
 * `submitVote(choice)`. **Switching sides is forbidden** — after a
 * wallet stakes on one side, additional stakes from that wallet on
 * the *other* side revert `CannotSwitchSides`. UIs should disable
 * the opposite-side button after the first stake.
 */
export const Side = {
  Yes: 0,
  No: 1,
} as const;
export type Side = (typeof Side)[keyof typeof Side];

/**
 * Sentinel value for `goal.winningSide` while the goal has not yet
 * been finalized.
 *
 * Emitted in the on-chain `Goal` struct as `255` (an out-of-range
 * value for the binary `Side` enum). Treat any value other than
 * `Side.Yes` / `Side.No` as "not resolved yet" — `GoalResolved` events
 * are guaranteed to carry one of the two real sides, never this
 * sentinel.
 */
export const UNRESOLVED_SIDE = 255 as const;
