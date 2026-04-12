import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";

const trackSchema = z.object({
  referralCode: z.string().min(3).max(50),
});

export default async function referralRoutes(app: FastifyInstance) {
  app.get(
    "/me",
    { preHandler: requireAuth },
    async (req, reply) => {
      const [referrals, stats] = await Promise.all([
        prisma.referral.findMany({
          where: { referrer_id: req.jwtUser.sub },
          orderBy: { verified_at: "desc" },
          take: 20,
          include: {
            referred: {
              select: {
                id: true,
                wallet_address: true,
                name: true,
                username: true,
                avatar_emoji: true,
                avatar_color: true,
              },
            },
          },
        }),
        prisma.referral.groupBy({
          by: ["status"],
          where: { referrer_id: req.jwtUser.sub },
          _count: true,
        }),
      ]);

      const statsMap: Record<string, number> = {
        pending: 0,
        verified: 0,
        rewarded: 0,
      };
      for (const s of stats) {
        statsMap[s.status] = s._count;
      }

      const me = await prisma.user.findUnique({
        where: { id: req.jwtUser.sub },
        select: { wallet_address: true },
      });

      return reply.send({
        stats: statsMap,
        referralCode: me?.wallet_address ?? req.jwtUser.wallet,
        recent: referrals.map((r) => ({
          id: r.id,
          status: r.status,
          verifiedAt: r.verified_at,
          rewardTxHash: r.reward_tx_hash,
          referred: {
            id: r.referred.id,
            walletAddress: r.referred.wallet_address,
            name: r.referred.name,
            username: r.referred.username,
            avatarEmoji: r.referred.avatar_emoji,
            avatarColor: r.referred.avatar_color,
          },
        })),
      });
    }
  );

  app.post(
    "/track",
    { preHandler: requireAuth },
    async (req, reply) => {
      const body = trackSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({
          error: "ValidationError",
          message: body.error.errors[0]?.message ?? "Invalid input",
          statusCode: 400,
        });
      }

      const referralCode = body.data.referralCode.toLowerCase();

      const referrer = await prisma.user.findUnique({
        where: { wallet_address: referralCode },
      });

      if (!referrer) {
        return reply.status(404).send({
          error: "NotFound",
          message: "Referral code not found",
          statusCode: 404,
        });
      }

      if (referrer.id === req.jwtUser.sub) {
        return reply.status(400).send({
          error: "BadRequest",
          message: "Cannot refer yourself",
          statusCode: 400,
        });
      }

      const existing = await prisma.referral.findFirst({
        where: { referred_id: req.jwtUser.sub },
      });

      if (existing) {
        return reply.status(409).send({
          error: "Conflict",
          message: "You have already been referred",
          statusCode: 409,
        });
      }

      await prisma.$transaction([
        prisma.referral.create({
          data: {
            id: uuidv4(),
            referrer_id: referrer.id,
            referred_id: req.jwtUser.sub,
            status: "pending",
          },
        }),
        prisma.user.update({
          where: { id: req.jwtUser.sub },
          data: { referred_by: referrer.id },
        }),
      ]);

      return reply.send({ success: true });
    }
  );
}
