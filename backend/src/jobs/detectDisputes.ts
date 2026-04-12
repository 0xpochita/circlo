import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

const RESOLVE_WINDOW_MS = (72 + 1) * 60 * 60 * 1000;

export async function detectDisputes(): Promise<void> {
  const cutoff = new Date(Date.now() - RESOLVE_WINDOW_MS);

  const disputedGoals = await prisma.goal.findMany({
    where: {
      status: "resolving",
      deadline: { lt: cutoff },
    },
    include: { participants: true },
  });

  if (disputedGoals.length === 0) return;

  console.log(`[detectDisputes] Found ${disputedGoals.length} disputed goal(s)`);

  for (const goal of disputedGoals) {
    await prisma.goal.update({
      where: { id: goal.id },
      data: { status: "disputed" },
    });

    for (const participant of goal.participants) {
      const notification = {
        id: uuidv4(),
        userId: participant.user_id,
        type: "goal.disputed",
        entityType: "goal",
        entityId: goal.id,
        title: "Goal Disputed",
        description: `The goal "${goal.title}" was not resolved in time and is now disputed.`,
        unread: true,
        createdAt: new Date(),
      };

      await prisma.notification.upsert({
        where: { id: notification.id },
        create: {
          id: notification.id,
          user_id: participant.user_id,
          type: notification.type,
          entity_type: "goal",
          entity_id: goal.id,
          title: notification.title,
          description: notification.description,
        },
        update: {},
      });

      await redis.publish(
        `notifications:${participant.user_id}`,
        JSON.stringify(notification)
      );
    }

    console.log(`[detectDisputes] Marked goal ${goal.id} as disputed`);
  }
}
