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

async function publishNotification(
  userId: string,
  notification: object
): Promise<void> {
  await redis.publish(`notifications:${userId}`, JSON.stringify(notification));
}

export async function handleCircleCreated(args: {
  id: bigint;
  owner: string;
  isPrivate: boolean;
  metadataURI: string;
}): Promise<void> {
  const owner = args.owner.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { wallet_address: owner },
  });

  if (!user) {
    console.warn(
      `[CircleFactory] CircleCreated: user not found for owner ${owner}`
    );
    return;
  }

  const circle = await prisma.circle.findFirst({
    where: { owner_id: user.id, chain_id: null },
    orderBy: { created_at: "desc" },
  });

  if (circle) {
    await prisma.circle.update({
      where: { id: circle.id },
      data: { chain_id: args.id },
    });
  }

  const notification = {
    id: uuidv4(),
    userId: user.id,
    type: "circle.active",
    entityType: "circle",
    entityId: circle?.id ?? null,
    title: "Circle Active On-Chain",
    description: "Your circle is now active on the blockchain",
    unread: true,
    createdAt: new Date(),
  };

  await prisma.notification.create({
    data: {
      id: notification.id,
      user_id: user.id,
      type: notification.type,
      entity_type: "circle",
      entity_id: circle?.id ?? undefined,
      title: notification.title,
      description: notification.description,
    },
  });

  await publishNotification(user.id, notification);

  console.log(
    `[CircleFactory] CircleCreated: chain_id=${args.id}, owner=${owner}`
  );
}

export async function handleCircleJoined(args: {
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
      `[CircleFactory] CircleJoined: circle or user not found (chainId=${args.id}, member=${memberAddress})`
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
    `[CircleFactory] CircleJoined: circleId=${circle.id}, member=${memberAddress}`
  );
}

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
