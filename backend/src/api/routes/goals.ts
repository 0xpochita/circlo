import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { requireAuth } from "../middlewares/auth.js";
import { config } from "../../config.js";

const PAGE_SIZE = 20;

const createGoalSchema = z.object({
  circleId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  avatarEmoji: z.string().max(10).optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  outcomeType: z.enum(["binary", "multi", "numeric"]),
  deadline: z.string().datetime(),
  minStake: z.string().regex(/^\d+(\.\d{1,6})?$/, "Invalid stake amount"),
  resolverIds: z.array(z.string().uuid()).min(1).max(10),
  sides: z.array(z.string()).optional(),
});

const confirmGoalSchema = z.object({
  chainId: z.number(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

function serializeGoal(goal: {
  id: string;
  chain_id: bigint | null;
  circle_id: string;
  creator_id: string;
  title: string;
  description: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  outcome_type: string;
  deadline: Date;
  min_stake: { toString(): string };
  status: string;
  winning_side: string | null;
  metadata_uri: string | null;
  tx_hash: string | null;
  created_at: Date;
}) {
  return {
    id: goal.id,
    chainId: goal.chain_id?.toString() ?? null,
    circleId: goal.circle_id,
    creatorId: goal.creator_id,
    title: goal.title,
    description: goal.description,
    avatarEmoji: goal.avatar_emoji,
    avatarColor: goal.avatar_color,
    outcomeType: goal.outcome_type,
    deadline: goal.deadline,
    minStake: goal.min_stake.toString(),
    status: goal.status,
    winningSide: goal.winning_side,
    metadataUri: goal.metadata_uri,
    txHash: goal.tx_hash,
    createdAt: goal.created_at,
  };
}

async function publishNotification(userId: string, notification: object): Promise<void> {
  await redis.publish(`notifications:${userId}`, JSON.stringify(notification));
}

export default async function goalRoutes(app: FastifyInstance) {
  app.post(
    "/",
    { preHandler: requireAuth },
    async (req, reply) => {
      const body = createGoalSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({
          error: "ValidationError",
          message: body.error.errors[0]?.message ?? "Invalid input",
          statusCode: 400,
        });
      }

      const membership = await prisma.circleMember.findUnique({
        where: {
          circle_id_user_id: {
            circle_id: body.data.circleId,
            user_id: req.jwtUser.sub,
          },
        },
      });

      if (!membership) {
        return reply.status(403).send({
          error: "Forbidden",
          message: "You must be a circle member to create goals",
          statusCode: 403,
        });
      }

      const deadline = new Date(body.data.deadline);
      if (deadline <= new Date()) {
        return reply.status(400).send({
          error: "ValidationError",
          message: "Deadline must be in the future",
          statusCode: 400,
        });
      }

      const goalId = uuidv4();
      const metadataUri = `${config.frontendOrigin}/api/v1/goals/${goalId}/metadata`;

      const goal = await prisma.$transaction(async (tx) => {
        const g = await tx.goal.create({
          data: {
            id: goalId,
            circle_id: body.data.circleId,
            creator_id: req.jwtUser.sub,
            title: body.data.title,
            description: body.data.description,
            avatar_emoji: body.data.avatarEmoji,
            avatar_color: body.data.avatarColor,
            outcome_type: body.data.outcomeType,
            deadline,
            min_stake: body.data.minStake,
            metadata_uri: metadataUri,
            status: "open",
          },
        });

        await tx.goalResolver.createMany({
          data: body.data.resolverIds.map((userId) => ({
            goal_id: g.id,
            user_id: userId,
          })),
          skipDuplicates: true,
        });

        return g;
      });

      return reply.status(201).send({ id: goal.id, metadataUri: goal.metadata_uri });
    }
  );

  app.post(
    "/:id/confirm",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = confirmGoalSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({
          error: "ValidationError",
          message: body.error.errors[0]?.message ?? "Invalid input",
          statusCode: 400,
        });
      }

      const goal = await prisma.goal.findUnique({ where: { id } });
      if (!goal) {
        return reply.status(404).send({
          error: "NotFound",
          message: "Goal not found",
          statusCode: 404,
        });
      }

      if (goal.creator_id !== req.jwtUser.sub) {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Only the creator can confirm the goal",
          statusCode: 403,
        });
      }

      const updated = await prisma.goal.update({
        where: { id },
        data: {
          chain_id: BigInt(body.data.chainId),
          tx_hash: body.data.txHash,
          status: "open",
        },
      });

      const members = await prisma.circleMember.findMany({
        where: { circle_id: goal.circle_id, user_id: { not: req.jwtUser.sub } },
      });

      await Promise.all(
        members.map(async (m) => {
          const notification = {
            id: uuidv4(),
            userId: m.user_id,
            type: "goal.created",
            actorId: req.jwtUser.sub,
            entityType: "goal",
            entityId: id,
            title: "New Goal Created",
            description: `A new goal was created: "${goal.title}"`,
            unread: true,
            createdAt: new Date(),
          };

          await prisma.notification.create({
            data: {
              id: notification.id,
              user_id: m.user_id,
              type: notification.type,
              actor_id: req.jwtUser.sub,
              entity_type: "goal",
              entity_id: id,
              title: notification.title,
              description: notification.description,
            },
          });

          await publishNotification(m.user_id, notification);
        })
      );

      return reply.send(serializeGoal(updated));
    }
  );

  app.get(
    "/feed",
    async (req, reply) => {
      const { cursor } = req.query as { cursor?: string };

      const goals = await prisma.goal.findMany({
        where: {
          circle: { privacy: "public" },
          status: { in: ["open", "locked", "resolving"] },
        },
        take: PAGE_SIZE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { created_at: "desc" },
        include: { _count: { select: { participants: true } } },
      });

      const hasMore = goals.length > PAGE_SIZE;
      const items = hasMore ? goals.slice(0, PAGE_SIZE) : goals;

      return reply.send({
        items: items.map((g) => ({
          ...serializeGoal(g),
          participantCount: g._count.participants,
        })),
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
        hasMore,
      });
    }
  );

  app.get(
    "/mine",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { cursor } = req.query as { cursor?: string };

      const [created, participated] = await Promise.all([
        prisma.goal.findMany({
          where: { creator_id: req.jwtUser.sub },
          select: { id: true },
        }),
        prisma.goalParticipant.findMany({
          where: { user_id: req.jwtUser.sub },
          select: { goal_id: true },
        }),
      ]);

      const goalIds = [
        ...new Set([
          ...created.map((g) => g.id),
          ...participated.map((p) => p.goal_id),
        ]),
      ];

      const goals = await prisma.goal.findMany({
        where: { id: { in: goalIds } },
        take: PAGE_SIZE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { created_at: "desc" },
        include: { _count: { select: { participants: true } } },
      });

      const hasMore = goals.length > PAGE_SIZE;
      const items = hasMore ? goals.slice(0, PAGE_SIZE) : goals;

      return reply.send({
        items: items.map((g) => ({
          ...serializeGoal(g),
          participantCount: g._count.participants,
        })),
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
        hasMore,
      });
    }
  );

  app.get(
    "/:id",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const goal = await prisma.goal.findUnique({
        where: { id },
        include: {
          _count: { select: { participants: true } },
          resolvers: {
            include: {
              user: {
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
          },
        },
      });

      if (!goal) {
        return reply.status(404).send({
          error: "NotFound",
          message: "Goal not found",
          statusCode: 404,
        });
      }

      const summary = await prisma.goalParticipant.groupBy({
        by: ["side"],
        where: { goal_id: id },
        _sum: { staked: true },
        _count: true,
      });

      return reply.send({
        ...serializeGoal(goal),
        participantCount: goal._count.participants,
        participationSummary: summary.map((s) => ({
          side: s.side,
          totalStaked: s._sum.staked?.toString() ?? "0",
          count: s._count,
        })),
        resolvers: goal.resolvers.map((r) => ({
          userId: r.user_id,
          vote: r.vote,
          votedAt: r.voted_at,
          user: {
            id: r.user.id,
            walletAddress: r.user.wallet_address,
            name: r.user.name,
            username: r.user.username,
            avatarEmoji: r.user.avatar_emoji,
            avatarColor: r.user.avatar_color,
          },
        })),
      });
    }
  );

  app.get(
    "/:id/my-stake",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const participant = await prisma.goalParticipant.findUnique({
        where: {
          goal_id_user_id: {
            goal_id: id,
            user_id: req.jwtUser.sub,
          },
        },
      });

      if (!participant) {
        return reply.send({ staked: false, data: null });
      }

      return reply.send({
        staked: true,
        data: {
          side: participant.side,
          amount: participant.staked.toString(),
          claimedAmount: participant.claimed_amount?.toString() ?? null,
        },
      });
    }
  );

  app.get(
    "/:id/participants",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { cursor } = req.query as { cursor?: string };

      const goal = await prisma.goal.findUnique({ where: { id } });
      if (!goal) {
        return reply.status(404).send({
          error: "NotFound",
          message: "Goal not found",
          statusCode: 404,
        });
      }

      const participants = await prisma.goalParticipant.findMany({
        where: { goal_id: id },
        take: PAGE_SIZE + 1,
        ...(cursor ? { cursor: { goal_id_user_id: { goal_id: id, user_id: cursor } }, skip: 1 } : {}),
        orderBy: { created_at: "desc" },
        include: {
          user: {
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
      });

      const hasMore = participants.length > PAGE_SIZE;
      const items = hasMore ? participants.slice(0, PAGE_SIZE) : participants;

      return reply.send({
        items: items.map((p) => ({
          userId: p.user_id,
          side: p.side,
          staked: p.staked.toString(),
          claimed: p.claimed,
          claimedAmount: p.claimed_amount?.toString() ?? null,
          createdAt: p.created_at,
          user: {
            id: p.user.id,
            walletAddress: p.user.wallet_address,
            name: p.user.name,
            username: p.user.username,
            avatarEmoji: p.user.avatar_emoji,
            avatarColor: p.user.avatar_color,
          },
        })),
        nextCursor: hasMore ? items[items.length - 1]?.user_id : null,
        hasMore,
      });
    }
  );
}
