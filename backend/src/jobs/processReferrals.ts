import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import type { ProcessReferralJobData } from "../types/index.js";

/**
 * One-shot job — fired by the stake handler when a user makes their
 * first stake, to verify a pending referral attached to that user.
 *
 * Verification criteria:
 *   1. The user has a `pending` referral record (created on signup).
 *   2. The user has exactly one `GoalParticipant` row — i.e. this
 *      stake we're processing IS their first ever.
 *
 * If both hold, mark the referral verified and notify the referrer.
 * Otherwise no-op: maybe the user signed up without a referral, or
 * they've staked before and the referral was already processed.
 *
 * The `participantCount !== 1` guard is the de-dupe — without it,
 * every stake from a freshly-referred user would re-fire the job
 * and spam the referrer with "verified!" notifications.
 */
export async function processReferrals(data: ProcessReferralJobData): Promise<void> {
  const { userId } = data;

  const referral = await prisma.referral.findFirst({
    where: { referred_id: userId, status: "pending" },
  });

  if (!referral) return;

  const participantCount = await prisma.goalParticipant.count({
    where: { user_id: userId },
  });

  if (participantCount !== 1) return;

  await prisma.referral.update({
    where: { id: referral.id },
    data: { status: "verified", verified_at: new Date() },
  });

  const notification = {
    id: uuidv4(),
    userId: referral.referrer_id,
    type: "referral.verified",
    actorId: userId,
    entityType: null as string | null,
    entityId: null as string | null,
    title: "Referral Verified!",
    description:
      "Someone you referred just made their first stake. Your referral has been verified!",
    unread: true,
    createdAt: new Date(),
  };

  await prisma.notification.upsert({
    where: { id: notification.id },
    create: {
      id: notification.id,
      user_id: referral.referrer_id,
      type: notification.type,
      actor_id: userId,
      title: notification.title,
      description: notification.description,
    },
    update: {},
  });

  await redis.publish(
    `notifications:${referral.referrer_id}`,
    JSON.stringify(notification)
  );

  process.stdout.write(`[processReferrals] verified referral ${referral.id} for user ${userId}\n`);
}
