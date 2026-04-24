import { formatUnits } from "viem";
import { config } from "../../config.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { celoClient } from "../../lib/viem.js";
import { goalJobQueue } from "../../jobs/index.js";

export const PREDICTION_POOL_ABI = [
  {
    type: "event",
    name: "GoalCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "circleId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "deadline", type: "uint256", indexed: false },
      { name: "minStake", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Staked",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "side", type: "uint8", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VoteSubmitted",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "resolver", type: "address", indexed: true },
      { name: "choice", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GoalLocked",
    inputs: [{ name: "goalId", type: "uint256", indexed: true }],
  },
  {
    type: "event",
    name: "GoalResolved",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "winningSide", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GoalRefunded",
    inputs: [{ name: "goalId", type: "uint256", indexed: true }],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

const STAKE_OF_ABI = [
  {
    type: "function",
    name: "stakeOf",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
      { name: "", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function publishNotification(
  userId: string,
  notification: object
): Promise<void> {
  await redis.publish(`notifications:${userId}`, JSON.stringify(notification));
}

function sideToString(side: number): string {
  return side === 0 ? "yes" : side === 1 ? "no" : `choice_${side}`;
}

function formatUsdt(amount: bigint): string {
  const str = amount.toString().padStart(7, "0");
  const integer = str.slice(0, -6) || "0";
  const decimal = str.slice(-6);
  return `${integer}.${decimal}`;
}

export async function handleGoalCreated(
  args: {
    id: bigint;
    circleId: bigint;
    creator: string;
    deadline: bigint;
    minStake: bigint;
  },
  txHash: string
): Promise<void> {
  const creatorAddress = args.creator.toLowerCase();

  const [circle, user] = await Promise.all([
    prisma.circle.findFirst({ where: { chain_id: args.circleId } }),
    prisma.user.findUnique({ where: { wallet_address: creatorAddress } }),
  ]);

  if (!circle || !user) {
    console.warn(
      `[PredictionPool] GoalCreated: circle or user not found (circleChainId=${args.circleId}, creator=${creatorAddress})`
    );
    return;
  }

  const alreadyIndexed = await prisma.goal.findFirst({
    where: { chain_id: args.id },
  });

  if (alreadyIndexed) {
    console.log(
      `[PredictionPool] GoalCreated: chain_id=${args.id} already indexed, skipping`
    );
    return;
  }

  const existingGoal = await prisma.goal.findFirst({
    where: {
      creator_id: user.id,
      circle_id: circle.id,
      chain_id: null,
    },
    orderBy: { created_at: "desc" },
  });

  if (existingGoal) {
    await prisma.goal.update({
      where: { id: existingGoal.id },
      data: { chain_id: args.id, status: "open" },
    });
  }

  const members = await prisma.circleMember.findMany({
    where: { circle_id: circle.id, user_id: { not: user.id } },
  });

  await Promise.all(
    members.map(async (m) => {
      const notifId = `goal.created:${args.id}:${m.user_id}:${txHash}`;
      const notification = {
        id: notifId,
        userId: m.user_id,
        type: "goal.created",
        actorId: user.id,
        entityType: "goal",
        entityId: existingGoal?.id ?? null,
        title: "New Goal",
        description: `A new prediction goal was created in "${circle.name}"`,
        unread: true,
        createdAt: new Date(),
      };

      await prisma.notification.upsert({
        where: { id: notifId },
        create: {
          id: notifId,
          user_id: m.user_id,
          type: notification.type,
          actor_id: user.id,
          entity_type: "goal",
          entity_id: existingGoal?.id ?? undefined,
          title: notification.title,
          description: notification.description,
        },
        update: {},
      });

      await publishNotification(m.user_id, notification);
    })
  );

  console.log(
    `[PredictionPool] GoalCreated: chain_id=${args.id}, circle=${circle.id}`
  );
}

export async function handleStaked(
  args: {
    goalId: bigint;
    user: string;
    side: number;
    amount: bigint;
  },
  txHash: string
): Promise<void> {
  const userAddress = args.user.toLowerCase();

  const [goal, user] = await Promise.all([
    prisma.goal.findFirst({ where: { chain_id: args.goalId } }),
    prisma.user.findUnique({ where: { wallet_address: userAddress } }),
  ]);

  if (!goal || !user) {
    console.warn(
      `[PredictionPool] Staked: goal or user not found (goalChainId=${args.goalId}, user=${userAddress})`
    );
    return;
  }

  const sideStr = sideToString(args.side);
  const amountStr = formatUsdt(args.amount);

  const onChainStake = (await celoClient.readContract({
    address: config.contractPredictionPool as `0x${string}`,
    abi: STAKE_OF_ABI,
    functionName: "stakeOf",
    args: [args.goalId, args.user as `0x${string}`, args.side],
  })) as bigint;
  const stakedAmount = formatUnits(onChainStake, 6);

  await prisma.goalParticipant.upsert({
    where: {
      goal_id_user_id: { goal_id: goal.id, user_id: user.id },
    },
    create: {
      goal_id: goal.id,
      user_id: user.id,
      side: sideStr,
      staked: stakedAmount,
    },
    update: {
      staked: stakedAmount,
    },
  });

  if (goal.creator_id !== user.id) {
    const notifId = `goal.staked:${args.goalId}:${goal.creator_id}:${txHash}`;
    const notification = {
      id: notifId,
      userId: goal.creator_id,
      type: "goal.staked",
      actorId: user.id,
      entityType: "goal",
      entityId: goal.id,
      title: "New Stake",
      description: `Someone staked ${amountStr} USDT on your goal`,
      unread: true,
      createdAt: new Date(),
    };

    await prisma.notification.upsert({
      where: { id: notifId },
      create: {
        id: notifId,
        user_id: goal.creator_id,
        type: notification.type,
        actor_id: user.id,
        entity_type: "goal",
        entity_id: goal.id,
        title: notification.title,
        description: notification.description,
      },
      update: {},
    });

    await publishNotification(goal.creator_id, notification);
  }

  await goalJobQueue.add("processReferrals", {
    userId: user.id,
    goalId: goal.id,
  });

  console.log(
    `[PredictionPool] Staked: goalId=${goal.id}, user=${userAddress}, side=${sideStr}, amount=${amountStr}`
  );
}

export async function handleVoteSubmitted(args: {
  goalId: bigint;
  resolver: string;
  choice: number;
}): Promise<void> {
  const resolverAddress = args.resolver.toLowerCase();

  const [goal, user] = await Promise.all([
    prisma.goal.findFirst({ where: { chain_id: args.goalId } }),
    prisma.user.findUnique({ where: { wallet_address: resolverAddress } }),
  ]);

  if (!goal || !user) {
    console.warn(
      `[PredictionPool] VoteSubmitted: goal or resolver not found`
    );
    return;
  }

  const choiceStr = sideToString(args.choice);

  await prisma.goalResolver.updateMany({
    where: { goal_id: goal.id, user_id: user.id },
    data: { vote: choiceStr, voted_at: new Date() },
  });

  console.log(
    `[PredictionPool] VoteSubmitted: goalId=${goal.id}, resolver=${resolverAddress}, choice=${choiceStr}`
  );
}

export async function handleGoalLocked(
  args: {
    goalId: bigint;
  },
  txHash: string
): Promise<void> {
  const goal = await prisma.goal.findFirst({
    where: { chain_id: args.goalId },
    include: { resolvers: true },
  });

  if (!goal) {
    console.warn(`[PredictionPool] GoalLocked: goal not found (chainId=${args.goalId})`);
    return;
  }

  await prisma.goal.update({
    where: { id: goal.id },
    data: { status: "locked" },
  });

  await Promise.all(
    goal.resolvers.map(async (r) => {
      const notifId = `goal.resolution_needed:${args.goalId}:${r.user_id}:${txHash}`;
      const notification = {
        id: notifId,
        userId: r.user_id,
        type: "goal.resolution_needed",
        entityType: "goal",
        entityId: goal.id,
        title: "Your Vote is Needed",
        description: `A goal you are resolving has locked. Please cast your vote.`,
        unread: true,
        createdAt: new Date(),
      };

      await prisma.notification.upsert({
        where: { id: notifId },
        create: {
          id: notifId,
          user_id: r.user_id,
          type: notification.type,
          entity_type: "goal",
          entity_id: goal.id,
          title: notification.title,
          description: notification.description,
        },
        update: {},
      });

      await publishNotification(r.user_id, notification);
    })
  );

  console.log(`[PredictionPool] GoalLocked: goalId=${goal.id}`);
}

export async function handleGoalResolved(
  args: {
    goalId: bigint;
    winningSide: number;
  },
  txHash: string
): Promise<void> {
  const goal = await prisma.goal.findFirst({
    where: { chain_id: args.goalId },
    include: { participants: true },
  });

  if (!goal) {
    console.warn(`[PredictionPool] GoalResolved: goal not found (chainId=${args.goalId})`);
    return;
  }

  const winningSideStr = sideToString(args.winningSide);

  await prisma.goal.update({
    where: { id: goal.id },
    data: { status: "resolved", winning_side: winningSideStr },
  });

  await Promise.all(
    goal.participants.map(async (p) => {
      const won = p.side === winningSideStr;
      const type = won ? "reward.claimable" : "goal.resolved";
      const notifId = `${type}:${args.goalId}:${p.user_id}:${txHash}`;
      const notification = {
        id: notifId,
        userId: p.user_id,
        type,
        entityType: "goal",
        entityId: goal.id,
        title: won ? "You Won! Claim Your Reward" : "Goal Resolved",
        description: won
          ? `The goal "${goal.title}" resolved in your favor. Claim your reward!`
          : `The goal "${goal.title}" has been resolved. You lost this round.`,
        unread: true,
        createdAt: new Date(),
      };

      await prisma.notification.upsert({
        where: { id: notifId },
        create: {
          id: notifId,
          user_id: p.user_id,
          type: notification.type,
          entity_type: "goal",
          entity_id: goal.id,
          title: notification.title,
          description: notification.description,
        },
        update: {},
      });

      await publishNotification(p.user_id, notification);
    })
  );

  console.log(
    `[PredictionPool] GoalResolved: goalId=${goal.id}, winningSide=${winningSideStr}`
  );
}

export async function handleGoalRefunded(
  args: {
    goalId: bigint;
  },
  txHash: string
): Promise<void> {
  const goal = await prisma.goal.findFirst({
    where: { chain_id: args.goalId },
    include: { participants: true },
  });

  if (!goal) {
    console.warn(`[PredictionPool] GoalRefunded: goal not found (chainId=${args.goalId})`);
    return;
  }

  await prisma.goal.update({
    where: { id: goal.id },
    data: { status: "disputed" },
  });

  await Promise.all(
    goal.participants.map(async (p) => {
      const notifId = `goal.disputed:${args.goalId}:${p.user_id}:${txHash}`;
      const notification = {
        id: notifId,
        userId: p.user_id,
        type: "goal.disputed",
        entityType: "goal",
        entityId: goal.id,
        title: "Goal Disputed — Refund Available",
        description: `The goal "${goal.title}" was disputed. You can request a refund.`,
        unread: true,
        createdAt: new Date(),
      };

      await prisma.notification.upsert({
        where: { id: notifId },
        create: {
          id: notifId,
          user_id: p.user_id,
          type: notification.type,
          entity_type: "goal",
          entity_id: goal.id,
          title: notification.title,
          description: notification.description,
        },
        update: {},
      });

      await publishNotification(p.user_id, notification);
    })
  );

  console.log(`[PredictionPool] GoalRefunded: goalId=${goal.id}`);
}

export async function handleClaimed(args: {
  goalId: bigint;
  user: string;
  amount: bigint;
}): Promise<void> {
  const userAddress = args.user.toLowerCase();

  const [goal, user] = await Promise.all([
    prisma.goal.findFirst({ where: { chain_id: args.goalId } }),
    prisma.user.findUnique({ where: { wallet_address: userAddress } }),
  ]);

  if (!goal || !user) {
    console.warn(`[PredictionPool] Claimed: goal or user not found`);
    return;
  }

  const amountStr = formatUsdt(args.amount);

  await prisma.goalParticipant.updateMany({
    where: { goal_id: goal.id, user_id: user.id },
    data: { claimed: true, claimed_amount: amountStr },
  });

  console.log(
    `[PredictionPool] Claimed: goalId=${goal.id}, user=${userAddress}, amount=${amountStr}`
  );
}
