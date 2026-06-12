import { redis } from "./redis.js";

export async function publishNotification(
  userId: string,
  notification: object
): Promise<void> {
  await redis.publish(`notifications:${userId}`, JSON.stringify(notification));
}
