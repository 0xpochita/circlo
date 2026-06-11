import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

/**
 * Periodic job — flips every `open` goal past its deadline into the
 * `locked` state and pings the resolver(s) that their vote is needed.
 *
 * **Off-chain only**: this updates the backend status mirror, NOT the
 * on-chain `PredictionPool.lockGoal` state. The on-chain transition
 * happens permissionlessly when any wallet (resolver, staker, or
 * indexer keeper) calls `lockGoal(goalId)`. Backend lock is what
 * drives the UI's "needs your vote" surfacing — the on-chain lock
 * is what unlocks the resolver vote endpoint.
 *
 * Notifications are both persisted (Prisma upsert) and broadcast
 * over Redis `PUBLISH` so connected websocket clients pick them up
 * in real time without a database poll.
 *
 * Idempotent via the upsert: re-running on the same goal set is
 * cheap and doesn't duplicate notifications.
 */
export async function lockExpiredGoals(): Promise<void> {
  const now = new Date();

  const expiredGoals = await prisma.goal.findMany({
    where: {
      status: "open",
      deadline: { lt: now },
    },
    include: { resolvers: true },
  });

  if (expiredGoals.length === 0) return;

  process.stdout.write(`[lockExpiredGoals] locking ${expiredGoals.length} expired goal(s)\n`);

  for (const goal of expiredGoals) {
    await prisma.goal.update({
      where: { id: goal.id },
      data: { status: "locked" },
    });

    for (const resolver of goal.resolvers) {
      const notification = {
        id: uuidv4(),
        userId: resolver.user_id,
        type: "goal.resolution_needed",
        entityType: "goal",
        entityId: goal.id,
        title: "Your Vote is Needed",
        description: `The goal "${goal.title}" has expired and needs your resolution vote.`,
        unread: true,
        createdAt: new Date(),
      };

      await prisma.notification.upsert({
        where: { id: notification.id },
        create: {
          id: notification.id,
          user_id: resolver.user_id,
          type: notification.type,
          entity_type: "goal",
          entity_id: goal.id,
          title: notification.title,
          description: notification.description,
        },
        update: {},
      });

      await redis.publish(
        `notifications:${resolver.user_id}`,
        JSON.stringify(notification)
      );
    }

    process.stdout.write(`[lockExpiredGoals] locked goal ${goal.id}\n`);
  }
}
