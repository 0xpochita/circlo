import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

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

  console.log(`[lockExpiredGoals] Locking ${expiredGoals.length} expired goal(s)`);

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

    console.log(`[lockExpiredGoals] Locked goal ${goal.id}`);
  }
}
