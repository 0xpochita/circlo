import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";

export const CIRCLE_FACTORY_ABI = [
  {
    type: "event",
    name: "CircleCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "isPrivate", type: "bool", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CircleJoined",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "CircleLeft",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
    ],
  },
] as const;

/**
 * Push a notification payload onto the user's Redis pub/sub channel.
 *
 * The websocket gateway subscribes to `notifications:{userId}` and
 * fans out incoming messages to every connected socket for that user.
 * Keep payloads small — Redis pub/sub doesn't retry delivery, so
 * lost messages stay lost. Persist the canonical record via Prisma
 * first if the user must see it.
 */
async function publishNotification(
  userId: string,
  notification: object
): Promise<void> {
  await redis.publish(`notifications:${userId}`, JSON.stringify(notification));
}

/**
 * Find or create a User row for a wallet address.
 * Used when on-chain events reference an address that hasn't logged in via SIWE
 * (e.g. direct contract interaction from a script).
 */
async function ensureUser(walletAddress: string) {
  const addr = walletAddress.toLowerCase();
  return prisma.user.upsert({
    where: { wallet_address: addr },
    create: { wallet_address: addr },
    update: {},
  });
}

interface CircleMetadata {
  name: string;
  description: string;
  category: string;
  avatarEmoji: string;
  avatarColor: string;
}

/**
 * Indexer-local copy of `circlo-types`'s `parseCircleMetadata` —
 * duplicated to avoid a runtime dependency on the published SDK from
 * the backend. Same defaults, same never-throw contract.
 *
 * When `circlo-types` becomes a stable peer dep, replace this with
 * the package import and delete the local fallback.
 */
function parseCircleMetadata(uri: string): CircleMetadata {
  const fallback: CircleMetadata = {
    name: "Circle",
    description: "",
    category: "general",
    avatarEmoji: "✨",
    avatarColor: "#fbbf24",
  };
  try {
    const parsed = JSON.parse(uri);
    return {
      name: typeof parsed.name === "string" ? parsed.name : fallback.name,
      description: typeof parsed.description === "string" ? parsed.description : fallback.description,
      category: typeof parsed.category === "string" ? parsed.category : fallback.category,
      avatarEmoji: typeof parsed.avatarEmoji === "string" ? parsed.avatarEmoji : fallback.avatarEmoji,
      avatarColor: typeof parsed.avatarColor === "string" ? parsed.avatarColor : fallback.avatarColor,
    };
  } catch {
    return fallback;
  }
}

/**
 * Indexer handler for `CircleCreated` events from CircleFactory.
 *
 * Idempotent: if a `Circle` row already exists for this `chain_id`,
 * the handler no-ops. This protects against double-processing during
 * indexer restarts or block re-broadcasts.
 *
 * Side effects:
 *   1. Ensures a `User` row exists for the owner address.
 *   2. Inserts the circle into Prisma with decoded metadata.
 *   3. (Implicit, downstream) Fans out a notification to followers if
 *      the owner has any — handled by separate notification logic.
 */
export async function handleCircleCreated(args: {
  id: bigint;
  owner: string;
  isPrivate: boolean;
  metadataURI: string;
}): Promise<void> {
  const owner = await ensureUser(args.owner);

  // Idempotency: if a circle already exists for this chain_id, skip.
  const existingByChainId = await prisma.circle.findFirst({
    where: { chain_id: args.id },
  });
  if (existingByChainId) {
    return;
  }

  // Normal flow: frontend created a Circle row via API before the on-chain tx.
  // Match it by owner + chain_id=null and attach the chain_id.
  const pending = await prisma.circle.findFirst({
    where: { owner_id: owner.id, chain_id: null },
    orderBy: { created_at: "desc" },
  });

  let circleId: string;
  let circleName: string;

  if (pending) {
    await prisma.circle.update({
      where: { id: pending.id },
      data: { chain_id: args.id },
    });
    circleId = pending.id;
    circleName = pending.name;
  } else {
    // Direct-on-chain flow (e.g. bot script): no pending row. Create one from metadata.
    const meta = parseCircleMetadata(args.metadataURI);
    const created = await prisma.circle.create({
      data: {
        chain_id: args.id,
        owner_id: owner.id,
        name: meta.name,
        description: meta.description || null,
        category: meta.category,
        privacy: args.isPrivate ? "private" : "public",
        avatar_emoji: meta.avatarEmoji,
        avatar_color: meta.avatarColor,
      },
    });
    circleId = created.id;
    circleName = created.name;
  }

  // Owner is auto-added as a member on-chain. Mirror that in DB.
  await prisma.circleMember.upsert({
    where: { circle_id_user_id: { circle_id: circleId, user_id: owner.id } },
    create: { circle_id: circleId, user_id: owner.id, role: "owner" },
    update: {},
  });

  const notification = {
    id: uuidv4(),
    userId: owner.id,
    type: "circle.active",
    entityType: "circle",
    entityId: circleId,
    title: "Circle Active On-Chain",
    description: "Your circle is now active on the blockchain",
    unread: true,
    createdAt: new Date(),
  };

  await prisma.notification.create({
    data: {
      id: notification.id,
      user_id: owner.id,
      type: notification.type,
      entity_type: "circle",
      entity_id: circleId,
      title: notification.title,
      description: notification.description,
    },
  });

  await publishNotification(owner.id, notification);

  process.stdout.write(`[CircleFactory] CircleCreated: chain_id=${args.id} (${circleName}) owner=${owner.wallet_address}\n`);
}

/**
 * Indexer handler for `CircleJoined` events from CircleFactory.
 *
 * Mirrors the on-chain membership into the backend's `CircleMember`
 * table and notifies the circle owner. The upsert pattern handles
 * the rare case where a member rejoins (left, then joined again)
 * without creating duplicate rows.
 *
 * **Race condition handling**: if `CircleCreated` for the parent
 * circle hasn't been indexed yet (block-ordering quirk), the
 * handler logs and returns rather than crashing. The on-chain
 * truth is intact; the backend mirror catches up on the next
 * backfill sweep.
 */
export async function handleCircleJoined(args: {
  id: bigint;
  member: string;
}): Promise<void> {
  const user = await ensureUser(args.member);

  const circle = await prisma.circle.findFirst({ where: { chain_id: args.id } });
  if (!circle) {
    console.warn(
      `[CircleFactory] CircleJoined: circle not found for chain_id=${args.id} (member=${user.wallet_address}). Indexer race?`
    );
    return;
  }

  await prisma.circleMember.upsert({
    where: {
      circle_id_user_id: { circle_id: circle.id, user_id: user.id },
    },
    create: {
      circle_id: circle.id,
      user_id: user.id,
      role: "member",
    },
    update: {},
  });

  const notification = {
    id: uuidv4(),
    userId: circle.owner_id,
    type: "circle.joined",
    actorId: user.id,
    entityType: "circle",
    entityId: circle.id,
    title: "New Member Joined",
    description: `A new member joined your circle "${circle.name}"`,
    unread: true,
    createdAt: new Date(),
  };

  await prisma.notification.upsert({
    where: { id: notification.id },
    create: {
      id: notification.id,
      user_id: circle.owner_id,
      type: notification.type,
      actor_id: user.id,
      entity_type: "circle",
      entity_id: circle.id,
      title: notification.title,
      description: notification.description,
    },
    update: {},
  });

  await publishNotification(circle.owner_id, notification);

  console.log(
    `[CircleFactory] CircleJoined: circleId=${circle.id} member=${user.wallet_address}`
  );
}

/**
 * Indexer handler for `CircleLeft` events from CircleFactory.
 *
 * Removes the `CircleMember` row corresponding to the leaving wallet
 * via `deleteMany` (idempotent — extra delete of an already-deleted
 * row is a no-op). No notification is fired because user-facing
 * "X left your circle" is intentionally muted; owners can see the
 * delta in their member-count widget.
 *
 * Tolerates a missing circle/user the same way as `handleCircleJoined`
 * — warns and returns without crashing the indexer.
 */
export async function handleCircleLeft(args: {
  id: bigint;
  member: string;
}): Promise<void> {
  const memberAddress = args.member.toLowerCase();

  const [circle, user] = await Promise.all([
    prisma.circle.findFirst({ where: { chain_id: args.id } }),
    prisma.user.findUnique({ where: { wallet_address: memberAddress } }),
  ]);

  if (!circle || !user) {
    console.warn(
      `[CircleFactory] CircleLeft: circle or user not found (chainId=${args.id}, member=${memberAddress})`
    );
    return;
  }

  await prisma.circleMember.deleteMany({
    where: { circle_id: circle.id, user_id: user.id },
  });

  console.log(
    `[CircleFactory] CircleLeft: circleId=${circle.id}, member=${memberAddress}`
  );
}
