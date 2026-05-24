/**
 * Decimals for native USDT on Celo Mainnet
 * (`0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e`).
 *
 * Worth noting because Celo USDT differs from the more common
 * Ethereum / Tron USDT contracts which also use 6 — but USDC on
 * many chains uses 6 too, so contributors moving between codebases
 * sometimes assume 18. Don't.
 */
export const USDT_DECIMALS = 6;

/**
 * Minimum stake exposed in the goal-creation UI as the suggested
 * starting value. Picked so a single stake fits comfortably inside a
 * MiniPay user's smallest balance: 0.0001 USDT = 100 base units
 * (smallest representable amount above zero with 6 decimals × order
 * of magnitude room for fee math without underflow).
 *
 * Treat as a string because the form binds directly to an `<input>`.
 */
export const DEFAULT_MIN_STAKE = "0.0001";

/**
 * Convert a human-readable USDT amount (e.g. `1.5`) to the on-chain
 * base-unit `bigint` PredictionPool expects.
 *
 * Uses `Math.round` because `0.1 * 1e6` famously yields `99999.99…`
 * in IEEE-754. For inputs originating from user-typed strings, prefer
 * viem's `parseUnits` to preserve arbitrary precision.
 */
export function toUSDT(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDT_DECIMALS));
}

/**
 * Inverse of {@link toUSDT}. Returns a `number`, which is fine for
 * UI display up to ~9 quadrillion USDT but loses precision past
 * `Number.MAX_SAFE_INTEGER`. For exact display of arbitrary on-chain
 * amounts prefer viem's `formatUnits` against the raw `bigint`.
 */
export function fromUSDT(amount: bigint): number {
  return Number(amount) / 10 ** USDT_DECIMALS;
}
