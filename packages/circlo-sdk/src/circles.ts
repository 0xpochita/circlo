import type { Address, Hash, WalletClient, PublicClient, Account, Chain } from "viem";
import { decodeEventLog, publicActions } from "viem";
import { CIRCLE_FACTORY_ABI, CIRCLO_CONTRACTS } from "circlo-types";

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
 * @throws if the SDK has no walletClient configured, or if the tx reverts.
 */
export async function createCircle(
  wallet: WalletClient,
  params: CreateCircleParams,
  publicClientOverride?: PublicClient,
): Promise<CreateCircleResult> {
  if (!wallet.account) {
    throw new Error("createCircle: walletClient must be configured with an account");
  }

  const metadataURI = JSON.stringify({
    name: params.name,
    ...(params.description && { description: params.description }),
    ...(params.category && { category: params.category }),
    avatarEmoji: params.avatarEmoji ?? "🎯",
    ...(params.avatarColor && { avatarColor: params.avatarColor }),
    ...params.extra,
  });

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

  throw new Error(
    `createCircle: tx ${hash} confirmed but no CircleCreated event was found in receipt`,
  );
}

/**
 * Check whether an address is a member of a circle (read-only).
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
 * Join a public circle. Reverts if the circle is private — use
 * `joinPrivateCircle` with a signed inviteProof instead.
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
 * Join a private circle using a signed EIP-712 inviteProof issued by
 * the circle owner. The proof bytes layout is defined by the
 * CircleFactory contract; build it with the helper in your dapp.
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
 * The circle owner cannot leave — they must transfer ownership first.
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
 * Read a page of circle members. Cursor-paginated by offset/limit.
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
