/**
 * Custom error classes thrown by the SDK. Use `instanceof` checks
 * (or the `name` field) in catch blocks to distinguish error types.
 *
 * Every SDK error extends the base `CircloSdkError` so callers can
 * blanket-catch all library errors without catching unrelated runtime
 * exceptions:
 *
 * ```ts
 * try {
 *   await circlo.createCircle({ name: "Gym Squad", privacy: "public" });
 * } catch (e) {
 *   if (e instanceof NotConfiguredError) {
 *     // Tell the user to connect their wallet.
 *   } else if (e instanceof TxRevertedError) {
 *     // Show e.txHash so they can inspect on Celoscan.
 *   } else {
 *     throw e; // not our problem
 *   }
 * }
 * ```
 */

/**
 * Base class for every error the SDK throws. Catch this to filter
 * library errors without accidentally swallowing arbitrary runtime
 * exceptions (TypeError, RangeError, etc.) — see also
 * {@link isSdkError} for a type-narrowing guard you can use without
 * an `instanceof` import.
 */
export class CircloSdkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Type guard for SDK errors. Useful when the catch site can't
 * import the error classes directly (transitive dependency cases) or
 * when you want a single check that covers every SDK error subclass.
 *
 * @example
 * ```ts
 * try {
 *   await settlement(wallet);
 * } catch (e) {
 *   if (isSdkError(e)) {
 *     // Render e.message — known SDK failure shape.
 *   } else {
 *     throw e; // Unknown runtime error, re-throw.
 *   }
 * }
 * ```
 */
export function isSdkError(e: unknown): e is CircloSdkError {
  return e instanceof CircloSdkError;
}

/**
 * Thrown when an SDK method needs a `walletClient` or `publicClient`
 * that wasn't supplied to `createCircloClient`.
 *
 * Both `operation` (the SDK method name) and `missing` (which client
 * is absent) are exposed as readable fields so consumers can render a
 * targeted "connect wallet" prompt for `walletClient` misses without
 * conflating them with read-side misses.
 *
 * @example
 * ```ts
 * try {
 *   await circlo.stake({ goalId: 1n, side: 1, amount: 100n });
 * } catch (e) {
 *   if (e instanceof NotConfiguredError && e.missing === "walletClient") {
 *     showConnectWalletPrompt();
 *   } else throw e;
 * }
 * ```
 */
export class NotConfiguredError extends CircloSdkError {
  readonly operation: string;
  readonly missing: "walletClient" | "publicClient";

  constructor(operation: string, missing: "walletClient" | "publicClient") {
    const detail =
      missing === "walletClient"
        ? "pass one to createCircloClient(...) to send writes"
        : "pass one to createCircloClient(...) for reads + event queries";
    super(`${operation}: CircloClient was created without a ${missing} — ${detail}`);
    this.operation = operation;
    this.missing = missing;
  }
}

/**
 * Thrown after a write tx confirms but the expected event was missing
 * from the receipt logs.
 *
 * Two common causes:
 * 1. The on-chain function reverted silently (status=success but no
 *    state change) — rare, but possible with proxy delegate-call
 *    edge cases.
 * 2. The event signature in `circlo-types` drifted from the deployed
 *    contract (post-upgrade ABI mismatch).
 *
 * The `txHash` field lets the UI link the user directly to the
 * explorer for manual inspection, and the `eventName` field
 * disambiguates when one SDK call could emit multiple events.
 *
 * @example
 * ```ts
 * try {
 *   await createCircle(wallet, params);
 * } catch (e) {
 *   if (e instanceof EventNotFoundError) {
 *     toast(`Tx ${e.txHash.slice(0, 10)}... may have silently failed`);
 *   } else throw e;
 * }
 * ```
 */
export class EventNotFoundError extends CircloSdkError {
  readonly txHash: `0x${string}`;
  readonly eventName: string;

  constructor(eventName: string, txHash: `0x${string}`) {
    super(
      `tx ${txHash} confirmed but no ${eventName} event was found in receipt — ` +
        `the call likely reverted on-chain or the receipt was queried too early`,
    );
    this.txHash = txHash;
    this.eventName = eventName;
  }
}

/**
 * Thrown when a tx receipt comes back with `status: "reverted"`.
 *
 * The on-chain function rejected the call. Common causes:
 *
 * - **createGoal**: `DeadlineTooSoon`, `NotCircleMember`, `NoResolvers`
 * - **stake**: `GoalLocked`, `BelowMinStake`, `CannotSwitchSides`,
 *   USDT allowance below `amount`
 * - **claim**: `NotResolved`, `NothingToClaim`
 * - **refund**: `NotRefundable`, `NothingToRefund`
 * - **submitVote**: `NotResolver`, `AlreadyVoted`, `VoteWindowExpired`
 *
 * The base error message just points the user at the explorer —
 * Celoscan decodes most custom errors and shows the exact name. The
 * `txHash` field is exposed for `explorerTxUrl` builders.
 *
 * @example
 * ```ts
 * try {
 *   await stake(wallet, params);
 * } catch (e) {
 *   if (e instanceof TxRevertedError) {
 *     window.open(explorerTxUrl(e.txHash), "_blank");
 *   } else throw e;
 * }
 * ```
 */
export class TxRevertedError extends CircloSdkError {
  readonly txHash: `0x${string}`;
  readonly operation: string;

  constructor(operation: string, txHash: `0x${string}`) {
    super(
      `${operation} reverted on-chain. Inspect tx ${txHash} on the explorer ` +
        `for the revert reason (Celoscan decodes most custom errors).`,
    );
    this.txHash = txHash;
    this.operation = operation;
  }
}
