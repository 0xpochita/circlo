import type { Address, Hash, WalletClient, PublicClient, Account, Chain } from "viem";
import { decodeEventLog, publicActions } from "viem";
import { CIRCLE_FACTORY_ABI, CIRCLO_CONTRACTS } from "circlo-types";
import { buildCircleMetadata } from "./metadata.js";
import { EventNotFoundError } from "./errors.js";

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
export async function createCircle(
  wallet: WalletClient,
  params: CreateCircleParams,
  publicClientOverride?: PublicClient,
): Promise<CreateCircleResult> {
  if (!wallet.account) {
    throw new Error("createCircle: walletClient must be configured with an account");
  }

  const metadataURI = buildCircleMetadata(params);

  const hash = await wallet.writeContract({
    address: CIRCLO_CONTRACTS.CircleFactory,
    abi: CIRCLE_FACTORY_ABI,
    functionName: "createCircle",
    args: [params.privacy === "private", metadataURI],
    account: wallet.account as Account,
    chain: wallet.chain as Chain,
  });

  const reader = publicClientOverride ?? (wallet.extend(publicActions) as unknown as PublicClient);
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
    } catch {
      // Not a CircleFactory event — skip.
    }
  }

  throw new EventNotFoundError("CircleCreated", hash);
}

/**
 * Check whether an address is a member of a circle (read-only).
 *
 * Backed by `CircleFactory.isCircleMember`. Never reverts — returns
 * `false` for non-existent circles, addresses that never joined, and
 * addresses that joined then left. Useful as the source of truth
 * before showing a member-only CTA (e.g. Create Goal, Resolve).
 *
 * @param client viem PublicClient pointed at the right chain.
 * @param circleId The circle's onchain id.
 * @param user The address to probe.
 * @returns `true` if currently a member, `false` otherwise.
 *
 * @example
 * ```ts
 * const isMember = await isCircleMember(publicClient, 42n, userAddr);
 * if (!isMember) return <JoinCircleButton />;
 * ```
 */
export async function isCircleMember(
  client: PublicClient,
  circleId: bigint,
  user: Address,
): Promise<boolean> {
  return client.readContract({
    address: CIRCLO_CONTRACTS.CircleFactory,
    abi: CIRCLE_FACTORY_ABI,
    functionName: "isCircleMember",
    args: [circleId, user],
  });
}

/**
 * Join a public circle. Reverts `CircleIsPrivate` if the circle is
 * invite-only — use `joinPrivateCircle` with a signed inviteProof
 * instead. Reverts `AlreadyMember` if the caller already joined.
 *
 * Idempotent at the indexer layer: the second join attempt reverts
 * on-chain rather than emitting a duplicate `CircleJoined` event.
 *
 * @throws `Error` if walletClient has no account configured.
 * @throws viem `ContractFunctionExecutionError` on revert.
 *
 * @example
 * ```ts
 * const hash = await joinCircle(wallet, 42n);
 * await publicClient.waitForTransactionReceipt({ hash });
 * ```
 */
export async function joinCircle(
  wallet: WalletClient,
  circleId: bigint,
): Promise<Hash> {
  if (!wallet.account) {
    throw new Error("joinCircle: walletClient must be configured with an account");
  }
  return wallet.writeContract({
    address: CIRCLO_CONTRACTS.CircleFactory,
    abi: CIRCLE_FACTORY_ABI,
    functionName: "joinCircle",
    args: [circleId],
    account: wallet.account as Account,
    chain: wallet.chain as Chain,
  });
}

/**
 * Join a private (invite-only) circle using a signed EIP-712
 * `InviteProof` issued by the circle owner.
 *
 * The proof is `abi.encode(bytes sig, uint256 expiry)` — `sig` is a
 * 65-byte ECDSA signature over the `InviteProof(circleId, joiner, expiry)`
 * struct hash. Build it with the EIP-712 helper in your dapp; this SDK
 * only forwards the bytes.
 *
 * Note: MiniPay's `signTypedData` is unreliable today — see
 * `docs/MINIPAY_INTEGRATION.md` for the desktop-fallback pattern.
 *
 * @throws viem `ContractFunctionExecutionError` on `InvalidInviteProof`,
 *   `InviteExpired`, `CircleNotFound`, or `AlreadyMember`.
 *
 * @example
 * ```ts
 * const proof = await buildInviteProofForCircle(ownerWallet, circleId, joiner);
 * const hash = await joinPrivateCircle(wallet, circleId, proof);
 * ```
 */
export async function joinPrivateCircle(
  wallet: WalletClient,
  circleId: bigint,
  inviteProof: `0x${string}`,
): Promise<Hash> {
  if (!wallet.account) {
    throw new Error("joinPrivateCircle: walletClient must be configured with an account");
  }
  return wallet.writeContract({
    address: CIRCLO_CONTRACTS.CircleFactory,
    abi: CIRCLE_FACTORY_ABI,
    functionName: "joinCirclePrivate",
    args: [circleId, inviteProof],
    account: wallet.account as Account,
    chain: wallet.chain as Chain,
  });
}

/**
 * Leave a circle the caller is currently a member of.
 *
 * Reverts `OwnerCannotLeave` if the caller is the circle owner — owners
 * must transfer ownership before they can leave. Reverts `NotAMember`
 * if the caller never joined (or already left). Emits `CircleLeft`.
 *
 * The membership history is append-only: a leave does NOT erase the
 * member from `getMembers`, but `isCircleMember` flips back to `false`.
 *
 * @throws viem `ContractFunctionExecutionError` on revert.
 *
 * @example
 * ```ts
 * await leaveCircle(wallet, 42n);
 * // isCircleMember(...) now returns false for this address.
 * ```
 */
export async function leaveCircle(
  wallet: WalletClient,
  circleId: bigint,
): Promise<Hash> {
  if (!wallet.account) {
    throw new Error("leaveCircle: walletClient must be configured with an account");
  }
  return wallet.writeContract({
    address: CIRCLO_CONTRACTS.CircleFactory,
    abi: CIRCLE_FACTORY_ABI,
    functionName: "leaveCircle",
    args: [circleId],
    account: wallet.account as Account,
    chain: wallet.chain as Chain,
  });
}

/**
 * Read a page of a circle's member list.
 *
 * Cursor-paginated by `offset` / `limit`. Returns the append-only
 * historical member list — addresses that joined AND later left
 * still appear in this result. Filter via `isCircleMember` per-row
 * if you need only-current members.
 *
 * @param client viem PublicClient pointed at the right chain.
 * @param circleId The circle's onchain id.
 * @param offset 0-indexed offset into the historical member list.
 * @param limit Page size; defaults to 100. Large pages may revert
 *   on RPC gas-limit caps — paginate in 100s for safety.
 * @returns A page of member addresses, oldest-join-first.
 *
 * @example
 * ```ts
 * const page = await getCircleMembers(client, 42n, 0n, 50n);
 * ```
 */
export async function getCircleMembers(
  client: PublicClient,
  circleId: bigint,
  offset = 0n,
  limit = 100n,
): Promise<readonly Address[]> {
  return client.readContract({
    address: CIRCLO_CONTRACTS.CircleFactory,
    abi: CIRCLE_FACTORY_ABI,
    functionName: "getMembers",
    args: [circleId, offset, limit],
  });
}

/**
 * Read the id that will be assigned to the next circle created.
 *
 * Equals `(total circles ever created) + 1` — useful for indexers
 * that want to know how many circles exist without iterating, and
 * for UIs that want to show a "total circles created" counter.
 *
 * Note: circle ids are stable and never recycled. A deleted circle
 * (none today, but reserved) would still leave a gap in the id range
 * rather than freeing the id for reuse.
 *
 * @param client viem PublicClient pointed at the right chain.
 * @returns The next-to-be-assigned circleId (also = total ever + 1).
 *
 * @example
 * ```ts
 * const next = await getCircleNextId(client);
 * console.log(`Total circles so far: ${next - 1n}`);
 * ```
 */
export async function getCircleNextId(client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: CIRCLO_CONTRACTS.CircleFactory,
    abi: CIRCLE_FACTORY_ABI,
    functionName: "nextCircleId",
  });
}

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
export async function getCircleInfo(
  client: PublicClient,
  circleId: bigint,
): Promise<CircleInfo> {
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
