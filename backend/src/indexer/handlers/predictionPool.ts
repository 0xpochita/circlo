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
      { name: "outcomeType", type: "uint8", indexed: false },
      { name: "deadline", type: "uint64", indexed: false },
      { name: "minStake", type: "uint128", indexed: false },
      { name: "resolvers", type: "address[]", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
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

async function ensureUser(walletAddress: string) {
  const addr = walletAddress.toLowerCase();
  return prisma.user.upsert({
    where: { wallet_address: addr },
    create: { wallet_address: addr },
    update: {},
  });
}

/**
 * Map the on-chain `OutcomeType` enum value to the lowercase string
 * the backend's enum column uses. The two namespaces are decoupled
 * — adding a new outcome type on-chain (e.g. `Range`) requires both
 * a Solidity enum bump AND adding the string case here.
 *
 * Unknown values fall through to "numeric" to keep the indexer
 * crash-free during a partial rollout.
 */
function outcomeTypeToString(t: number): string {
  return t === 0 ? "binary" : t === 1 ? "multi" : "numeric";
}

/**
 * Indexer-local parser for the goal `metadataURI` JSON.
 *
 * Handles **two** input shapes simultaneously:
 *   - **Bot script** writes a compound `avatar: "emoji|color"` field.
 *   - **Frontend** writes split `avatarEmoji` + `avatarColor` fields.
 *
 * Split fields take precedence over the compound `avatar` when both
 * are present — frontend writes are the canonical source going
 * forward. Falls back to a neutral default 🎯 on any parse failure.
 */
function parseGoalMetadata(uri: string): {
  title: string;
  description: string;
  avatarEmoji: string;
  avatarColor: string;
} {
  const fallback = {
    title: "Goal",
    description: "",
    avatarEmoji: "🎯",
    avatarColor: "#ec4899",
  };
  try {
    const p = JSON.parse(uri);
    // Bot uses single "avatar" field as "emoji|color"; frontend uses split fields.
    let avatarEmoji = fallback.avatarEmoji;
    let avatarColor = fallback.avatarColor;
    if (typeof p.avatar === "string" && p.avatar.includes("|")) {
      const [emoji, color] = p.avatar.split("|");
      avatarEmoji = emoji || fallback.avatarEmoji;
      avatarColor = color || fallback.avatarColor;
    }
    if (typeof p.avatarEmoji === "string") avatarEmoji = p.avatarEmoji;
    if (typeof p.avatarColor === "string") avatarColor = p.avatarColor;
    return {
      title: typeof p.title === "string" ? p.title : fallback.title,
      description: typeof p.description === "string" ? p.description : fallback.description,
      avatarEmoji,
      avatarColor,
    };
  } catch {
    return fallback;
  }
}

/**
 * Map the on-chain `Side` enum value to the lowercase string the
 * backend's `Stake.side` column uses.
 *
 * Note the inversion: on-chain `Side.Yes = 0`, `Side.No = 1`. The
 * mapping is preserved here verbatim — DO NOT swap the literals
 * thinking "yes = 1 is more intuitive", the indexer test suite will
 * catch the inversion but only via end-to-end fixture comparisons.
 */
function sideToString(side: number): string {
  return side === 0 ? "yes" : side === 1 ? "no" : `choice_${side}`;
}

/**
 * Format a USDT amount in base units (6 decimals) as a fixed-precision
 * string for log lines and notification copy.
 *
 * Manual implementation instead of `viem.formatUnits` because the
 * indexer's hot path emits many of these per second and the dot-split
 * here is faster than viem's regex-based parser. Always returns
 * exactly 6 decimal places — pad/trim at the call site if needed.
 */
function formatUsdt(amount: bigint): string {
  const str = amount.toString().padStart(7, "0");
  const integer = str.slice(0, -6) || "0";
  const decimal = str.slice(-6);
  return `${integer}.${decimal}`;
}

/**
 * Indexer handler for `GoalCreated` events from PredictionPool.
 *
 * Two paths converge here:
 *   1. **Frontend-led**: the user POSTed `goals` to the API first
 *      (`chain_id = null`), then signed the on-chain tx. We attach
 *      the chain id to the pending row in Prisma.
 *   2. **Direct-on-chain**: a script/bot called `createGoal` without
 *      going through the API. We create the Goal row from the event
 *      payload using `parseGoalMetadata` for display fields.
 *
 * Idempotent via `chain_id` uniqueness — re-indexing the same event
 * no-ops.
 *
 * Returns early if the parent circle hasn't been indexed yet
 * (cross-contract event-ordering race). On the next backfill the
 * circle row exists and re-processing succeeds.
 */
export async function handleGoalCreated(
  args: {
    id: bigint;
    circleId: bigint;
    creator: string;
    outcomeType: number;
    deadline: bigint;
    minStake: bigint;
    resolvers: readonly string[];
    metadataURI: string;
  },
  txHash: string
): Promise<void> {
  const user = await ensureUser(args.creator);

  const circle = await prisma.circle.findFirst({
    where: { chain_id: args.circleId },
  });

  if (!circle) {
    process.stderr.write(`[PredictionPool] GoalCreated: circle not found chain_id=${args.circleId}\n`);
    return;
  }

  // Idempotency: if this goal's chain_id is already in DB, do nothing.
  const alreadyIndexed = await prisma.goal.findFirst({
    where: { chain_id: args.id },
  });
  if (alreadyIndexed) {
    return;
  }

  // Normal flow: frontend created Goal via API with chain_id=null; attach chain_id.
  const pending = await prisma.goal.findFirst({
    where: { creator_id: user.id, circle_id: circle.id, chain_id: null },
    orderBy: { created_at: "desc" },
  });

  let goalId: string;
  if (pending) {
    await prisma.goal.update({
      where: { id: pending.id },
      data: { chain_id: args.id, status: "open", tx_hash: txHash },
    });
    goalId = pending.id;
  } else {
    // Direct-on-chain flow: create Goal from event data.
    const meta = parseGoalMetadata(args.metadataURI);
    const created = await prisma.goal.create({
      data: {
        chain_id: args.id,
        circle_id: circle.id,
        creator_id: user.id,
        title: meta.title,
        description: meta.description || null,
        avatar_emoji: meta.avatarEmoji,
        avatar_color: meta.avatarColor,
        outcome_type: outcomeTypeToString(args.outcomeType),
        deadline: new Date(Number(args.deadline) * 1000),
        min_stake: formatUnits(args.minStake, 6),
        status: "open",
        metadata_uri: args.metadataURI,
        tx_hash: txHash,
      },
    });
    goalId = created.id;
  }

  // Register resolvers from event (each resolver must already exist as User).
  for (const resolverAddr of args.resolvers) {
    const resolverUser = await ensureUser(resolverAddr);
    await prisma.goalResolver.upsert({
      where: {
        goal_id_user_id: { goal_id: goalId, user_id: resolverUser.id },
      },
      create: { goal_id: goalId, user_id: resolverUser.id },
      update: {},
    });
  }

  // Notify other circle members.
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
        entityId: goalId,
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
          entity_id: goalId,
          title: notification.title,
          description: notification.description,
        },
        update: {},
      });

      await publishNotification(m.user_id, notification);
    })
  );

  process.stdout.write(`[PredictionPool] GoalCreated: chain_id=${args.id} circle=${circle.chain_id}\n`);
}

/**
 * Indexer handler for `Staked` events from PredictionPool.
 *
 * Each call mirrors a per-stake row into the backend's `Stake`
 * table. Refreshes the canonical per-side total via on-chain
 * `stakeOf` read rather than summing event amounts client-side —
 * cheaper than tracking a running tally and immune to event-replay
 * double-counting.
 *
 * Race tolerance: if `GoalCreated` for the parent goal hasn't been
 * indexed yet (RPC re-ordering edge case), the handler warns and
 * returns. The next backfill sweep catches it once the parent row
 * exists.
 */
export async function handleStaked(
  args: {
    goalId: bigint;
    user: string;
    side: number;
    amount: bigint;
  },
  txHash: string
): Promise<void> {
  const user = await ensureUser(args.user);

  const goal = await prisma.goal.findFirst({ where: { chain_id: args.goalId } });
  if (!goal) {
    process.stderr.write(`[PredictionPool] Staked: goal not found chain_id=${args.goalId}\n`);
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

  process.stdout.write(`[PredictionPool] Staked: goalId=${goal.id} user=${user.wallet_address} side=${sideStr} amount=${amountStr}\n`);
}

/**
 * Indexer handler for `VoteSubmitted` events from ResolutionModule.
 *
 * Records the resolver's choice in `Vote`. Upserts the `GoalResolver`
 * row defensively — normally `GoalCreated` registers them, but
 * out-of-order RPC delivery can mean we see a vote before the
 * resolver registration. The upsert keeps the indexer crash-free
 * either way.
 *
 * No notification fires from this handler; the goal's `GoalResolved`
 * event (when quorum auto-finalizes) is what pings stakers.
 */
export async function handleVoteSubmitted(args: {
  goalId: bigint;
  resolver: string;
  choice: number;
}): Promise<void> {
  const user = await ensureUser(args.resolver);

  const goal = await prisma.goal.findFirst({ where: { chain_id: args.goalId } });
  if (!goal) {
    process.stderr.write(`[PredictionPool] VoteSubmitted: goal not found chain_id=${args.goalId}\n`);
    return;
  }

  const choiceStr = sideToString(args.choice);

  // Ensure resolver row exists (in case GoalCreated didn't register it for some reason).
  await prisma.goalResolver.upsert({
    where: { goal_id_user_id: { goal_id: goal.id, user_id: user.id } },
    create: {
      goal_id: goal.id,
      user_id: user.id,
      vote: choiceStr,
      voted_at: new Date(),
    },
    update: { vote: choiceStr, voted_at: new Date() },
  });

  process.stdout.write(`[PredictionPool] VoteSubmitted: goalId=${goal.id} resolver=${user.wallet_address} choice=${choiceStr}\n`);
}

/**
 * Indexer handler for `GoalLocked` events.
 *
 * Flips the backend mirror to `locked` and notifies every staker
 * that the resolution vote window is open. Stakers don't *do*
 * anything with this signal directly (they wait for `GoalResolved`),
 * but the notification keeps the per-goal timeline visible in the UI.
 */
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
    process.stderr.write(`[PredictionPool] GoalLocked: goal not found chainId=${args.goalId}\n`);
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

  process.stdout.write(`[PredictionPool] GoalLocked: goalId=${goal.id}\n`);
}

/**
 * Indexer handler for `GoalResolved` events.
 *
 * The big one — flips the goal to `paid_out`, sets the winning side,
 * and fans out notifications to every participant. Winners get a
 * "you won" notification with a CTA to claim; losers get a "goal
 * settled" message so the UI can stop showing the "pending" state.
 *
 * `winningSide` is one of `Side.Yes` / `Side.No` (never the
 * `UNRESOLVED_SIDE` sentinel — the contract only fires this event
 * with a real side).
 */
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
    process.stderr.write(`[PredictionPool] GoalResolved: goal not found chainId=${args.goalId}\n`);
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

  process.stdout.write(`[PredictionPool] GoalResolved: goalId=${goal.id} winningSide=${winningSideStr}\n`);
}

/**
 * Indexer handler for `GoalRefunded` events.
 *
 * Marks the goal `disputed` (the on-chain state at this point) and
 * notifies stakers that refund is available. Refund is per-staker
 * — the event fires only ONCE per goal (on first call), so the
 * handler can't assume one event per refund recipient. Notification
 * goes to every participant so each can come back and refund.
 */
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

/**
 * Indexer handler for `Claimed` events from PredictionPool.
 *
 * Records the claim transaction in `Stake.claimed_at` so the UI can
 * stop showing the "claim available" CTA on that stake. `amount` is
 * the post-fee payout — pair with `Stake.amount` if you need the
 * implied protocol-fee delta.
 *
 * No user notification here — the user just got USDT delivered, the
 * wallet activity surface is the more reliable signal. Updating the
 * Stake row is enough for the in-app history view.
 */
export async function handleClaimed(args: {
  goalId: bigint;
  user: string;
  amount: bigint;
}): Promise<void> {
  const user = await ensureUser(args.user);

  const goal = await prisma.goal.findFirst({ where: { chain_id: args.goalId } });
  if (!goal) {
    console.warn(`[PredictionPool] Claimed: goal not found for chain_id=${args.goalId}`);
    return;
  }

  const amountStr = formatUsdt(args.amount);

  await prisma.goalParticipant.updateMany({
    where: { goal_id: goal.id, user_id: user.id },
    data: { claimed: true, claimed_amount: amountStr },
  });

  console.log(
    `[PredictionPool] Claimed: goalId=${goal.id}, user=${user.wallet_address}, amount=${amountStr}`
  );
}
