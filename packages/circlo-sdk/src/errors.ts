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

export class CircloSdkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when an SDK method needs a walletClient or publicClient that
 * wasn't passed to createCircloClient.
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
 * Thrown after a write tx confirms but the expected event was not
 * found in the receipt logs. This usually means the on-chain function
 * reverted silently or our event signature drifted from the contract.
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
 * Thrown when a tx receipt comes back with `status: "reverted"`. This
 * means the on-chain function rejected the call — usually a contract
 * `require` failed (deadline too soon, insufficient allowance, caller
 * not a member, etc).
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
