import type { Address, Hash, WalletClient, PublicClient } from "viem";
export type CreateCircleParams = {
    /** Human-readable name for the circle (e.g. "Gym Squad"). */
    name: string;
    /** Optional longer description shown on the circle detail page. */
    description?: string;
    /** "public" = anyone can join via joinCircle; "private" = requires inviteProof. */
    privacy: "public" | "private";
    /** Optional emoji shown in the circle avatar (defaults to "🎯"). */
    avatarEmoji?: string;
    /** Optional hex color for the circle avatar background. */
    avatarColor?: string;
    /** Optional category tag ("fitness", "crypto", "study", etc). */
    category?: string;
    /** Free-form extra metadata merged into the metadataURI JSON. */
    extra?: Record<string, unknown>;
};
export type CreateCircleResult = {
    /** Transaction hash. */
    hash: Hash;
    /** The new circle's onchain id, parsed from the CircleCreated event. */
    circleId: bigint;
    /** The metadataURI string written to the contract. */
    metadataURI: string;
};
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
export declare function createCircle(wallet: WalletClient, params: CreateCircleParams, publicClientOverride?: PublicClient): Promise<CreateCircleResult>;
/**
 * Check whether an address is a member of a circle (read-only).
 */
export declare function isCircleMember(client: PublicClient, circleId: bigint, user: Address): Promise<boolean>;
/**
 * Join a public circle. Reverts if the circle is private — use
 * `joinPrivateCircle` with a signed inviteProof instead.
 */
export declare function joinCircle(wallet: WalletClient, circleId: bigint): Promise<Hash>;
/**
 * Join a private circle using a signed EIP-712 inviteProof issued by
 * the circle owner. The proof bytes layout is defined by the
 * CircleFactory contract; build it with the helper in your dapp.
 */
export declare function joinPrivateCircle(wallet: WalletClient, circleId: bigint, inviteProof: `0x${string}`): Promise<Hash>;
/**
 * Leave a circle the caller is currently a member of.
 * The circle owner cannot leave — they must transfer ownership first.
 */
export declare function leaveCircle(wallet: WalletClient, circleId: bigint): Promise<Hash>;
/**
 * Read a page of circle members. Cursor-paginated by offset/limit.
 */
export declare function getCircleMembers(client: PublicClient, circleId: bigint, offset?: bigint, limit?: bigint): Promise<readonly Address[]>;
/**
 * Read the id that will be assigned to the next circle created.
 * Equals `(total circles ever created) + 1` — useful for indexers
 * that want to know how many circles exist.
 */
export declare function getCircleNextId(client: PublicClient): Promise<bigint>;
export type CircleInfo = {
    owner: Address;
    isPrivate: boolean;
    createdAt: bigint;
    metadataURI: string;
};
/**
 * Read the on-chain info for a single circle: owner, privacy, createdAt,
 * and the raw metadataURI string. Pair with `parseCircleMetadata` from
 * circlo-types to decode the JSON.
 *
 * Backed by `CircleFactory.getCircle` — promoted to circlo-types 0.1.1.
 */
export declare function getCircleInfo(client: PublicClient, circleId: bigint): Promise<CircleInfo>;
//# sourceMappingURL=circles.d.ts.map