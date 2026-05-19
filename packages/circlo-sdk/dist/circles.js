import { decodeEventLog, publicActions } from "viem";
import { CIRCLE_FACTORY_ABI, CIRCLO_CONTRACTS } from "circlo-types";
import { buildCircleMetadata } from "./metadata.js";
import { EventNotFoundError } from "./errors.js";
/**
 * Creates a circle on the CircleFactory contract. Waits for the tx to be
 * mined, then parses the CircleCreated event to return the new circleId.
 *
 * The metadata JSON is built from the params object — you do not need to
 * stringify it yourself.
 *
 * @throws `Error` if the walletClient has no account configured.
 * @throws `EventNotFoundError` if the tx confirms but the CircleCreated
 *   event is missing from the receipt (usually means silent revert).
 * @throws viem `ContractFunctionExecutionError` if the createCircle tx
 *   reverts on chain.
 *
 * @example
 * ```ts
 * const { circleId } = await createCircle(wallet, {
 *   name: "Gym Squad",
 *   privacy: "public",
 *   avatarEmoji: "💪",
 * });
 * console.log(`Created circle #${circleId}`);
 * ```
 */
export async function createCircle(wallet, params, publicClientOverride) {
    if (!wallet.account) {
        throw new Error("createCircle: walletClient must be configured with an account");
    }
    const metadataURI = buildCircleMetadata(params);
    const hash = await wallet.writeContract({
        address: CIRCLO_CONTRACTS.CircleFactory,
        abi: CIRCLE_FACTORY_ABI,
        functionName: "createCircle",
        args: [params.privacy === "private", metadataURI],
        account: wallet.account,
        chain: wallet.chain,
    });
    const reader = publicClientOverride ?? wallet.extend(publicActions);
    const receipt = await reader.waitForTransactionReceipt({ hash });
    for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== CIRCLO_CONTRACTS.CircleFactory.toLowerCase()) {
            continue;
        }
        try {
            const decoded = decodeEventLog({
                abi: CIRCLE_FACTORY_ABI,
                data: log.data,
                topics: log.topics,
            });
            if (decoded.eventName === "CircleCreated") {
                return {
                    hash,
                    circleId: decoded.args.id,
                    metadataURI,
                };
            }
        }
        catch {
            // Not a CircleFactory event — skip.
        }
    }
    throw new EventNotFoundError("CircleCreated", hash);
}
/**
 * Check whether an address is a member of a circle (read-only).
 */
export async function isCircleMember(client, circleId, user) {
    return client.readContract({
        address: CIRCLO_CONTRACTS.CircleFactory,
        abi: CIRCLE_FACTORY_ABI,
        functionName: "isCircleMember",
        args: [circleId, user],
    });
}
/**
 * Join a public circle. Reverts if the circle is private — use
 * `joinPrivateCircle` with a signed inviteProof instead.
 */
export async function joinCircle(wallet, circleId) {
    if (!wallet.account) {
        throw new Error("joinCircle: walletClient must be configured with an account");
    }
    return wallet.writeContract({
        address: CIRCLO_CONTRACTS.CircleFactory,
        abi: CIRCLE_FACTORY_ABI,
        functionName: "joinCircle",
        args: [circleId],
        account: wallet.account,
        chain: wallet.chain,
    });
}
/**
 * Join a private circle using a signed EIP-712 inviteProof issued by
 * the circle owner. The proof bytes layout is defined by the
 * CircleFactory contract; build it with the helper in your dapp.
 */
export async function joinPrivateCircle(wallet, circleId, inviteProof) {
    if (!wallet.account) {
        throw new Error("joinPrivateCircle: walletClient must be configured with an account");
    }
    return wallet.writeContract({
        address: CIRCLO_CONTRACTS.CircleFactory,
        abi: CIRCLE_FACTORY_ABI,
        functionName: "joinCirclePrivate",
        args: [circleId, inviteProof],
        account: wallet.account,
        chain: wallet.chain,
    });
}
/**
 * Leave a circle the caller is currently a member of.
 * The circle owner cannot leave — they must transfer ownership first.
 */
export async function leaveCircle(wallet, circleId) {
    if (!wallet.account) {
        throw new Error("leaveCircle: walletClient must be configured with an account");
    }
    return wallet.writeContract({
        address: CIRCLO_CONTRACTS.CircleFactory,
        abi: CIRCLE_FACTORY_ABI,
        functionName: "leaveCircle",
        args: [circleId],
        account: wallet.account,
        chain: wallet.chain,
    });
}
/**
 * Read a page of circle members. Cursor-paginated by offset/limit.
 */
export async function getCircleMembers(client, circleId, offset = 0n, limit = 100n) {
    return client.readContract({
        address: CIRCLO_CONTRACTS.CircleFactory,
        abi: CIRCLE_FACTORY_ABI,
        functionName: "getMembers",
        args: [circleId, offset, limit],
    });
}
/**
 * Read the id that will be assigned to the next circle created.
 * Equals `(total circles ever created) + 1` — useful for indexers
 * that want to know how many circles exist.
 */
export async function getCircleNextId(client) {
    return client.readContract({
        address: CIRCLO_CONTRACTS.CircleFactory,
        abi: CIRCLE_FACTORY_ABI,
        functionName: "nextCircleId",
    });
}
/**
 * Read the on-chain info for a single circle: owner, privacy, createdAt,
 * and the raw metadataURI string. Pair with `parseCircleMetadata` from
 * circlo-types to decode the JSON.
 *
 * Backed by `CircleFactory.getCircle` — promoted to circlo-types 0.1.1.
 */
export async function getCircleInfo(client, circleId) {
    const result = await client.readContract({
        address: CIRCLO_CONTRACTS.CircleFactory,
        abi: CIRCLE_FACTORY_ABI,
        functionName: "getCircle",
        args: [circleId],
    });
    return {
        owner: result.owner,
        isPrivate: result.isPrivate,
        createdAt: result.createdAt,
        metadataURI: result.metadataURI,
    };
}
//# sourceMappingURL=circles.js.map