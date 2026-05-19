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
export declare class CircloSdkError extends Error {
    constructor(message: string);
}
/**
 * Thrown when an SDK method needs a walletClient or publicClient that
 * wasn't passed to createCircloClient.
 */
export declare class NotConfiguredError extends CircloSdkError {
    readonly operation: string;
    readonly missing: "walletClient" | "publicClient";
    constructor(operation: string, missing: "walletClient" | "publicClient");
}
/**
 * Thrown after a write tx confirms but the expected event was not
 * found in the receipt logs. This usually means the on-chain function
 * reverted silently or our event signature drifted from the contract.
 */
export declare class EventNotFoundError extends CircloSdkError {
    readonly txHash: `0x${string}`;
    readonly eventName: string;
    constructor(eventName: string, txHash: `0x${string}`);
}
/**
 * Thrown when a tx receipt comes back with `status: "reverted"`. This
 * means the on-chain function rejected the call — usually a contract
 * `require` failed (deadline too soon, insufficient allowance, caller
 * not a member, etc).
 */
export declare class TxRevertedError extends CircloSdkError {
    readonly txHash: `0x${string}`;
    readonly operation: string;
    constructor(operation: string, txHash: `0x${string}`);
}
//# sourceMappingURL=errors.d.ts.map