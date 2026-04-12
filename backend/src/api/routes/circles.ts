import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { requireAuth } from "../middlewares/auth.js";
import type { CircleCategory } from "../../types/index.js";

const CIRCLE_CATEGORIES: CircleCategory[] = [
  "general",
  "crypto",
  "fitness",
  "gaming",
  "music",
  "other",
];

const PAGE_SIZE = 20;

const createCircleSchema = z.object({
  chainId: z.number().optional(),
  name: z.string().min(3).max(40),
  description: z.string().max(500).optional(),
  category: z.enum(["general", "crypto", "fitness", "gaming", "music", "other"]),
  privacy: z.enum(["public", "private"]),
  avatarEmoji: z.string().max(10).optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

const joinCircleSchema = z.object({
  inviteCode: z.string().optional(),
});

const inviteSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
});

function serializeCircle(
  circle: {
    id: string;
    chain_id: bigint | null;
    owner_id: string;
    name: string;
    description: string | null;
    category: string;
    privacy: string;
    invite_code: string | null;
    avatar_emoji: string | null;
    avatar_color: string | null;
    created_at: Date;
  },
  memberCount?: number
) {
  return {
    id: circle.id,
    chainId: circle.chain_id?.toString() ?? null,
    ownerId: circle.owner_id,
    name: circle.name,
    description: circle.description,
    category: circle.category,
    privacy: circle.privacy,
    inviteCode: circle.invite_code,
    avatarEmoji: circle.avatar_emoji,
    avatarColor: circle.avatar_color,
    memberCount,
    createdAt: circle.created_at,
  };
}

async function publishNotification(
  userId: string,
  notification: object
): Promise<void> {
  await redis.publish(`notifications:${userId}`, JSON.stringify(notification));
}

export default async function circleRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { cursor } = req.query as { cursor?: string };

      const memberships = await prisma.circleMember.findMany({
        where: { user_id: req.jwtUser.sub },
        include: { circle: true },
        take: PAGE_SIZE + 1,
        ...(cursor
          ? {
              cursor: { circle_id_user_id: { circle_id: cursor, user_id: req.jwtUser.sub } },
              skip: 1,
            }
          : {}),
        orderBy: { joined_at: "desc" },
      });

      const hasMore = memberships.length > PAGE_SIZE;
      const items = hasMore ? memberships.slice(0, PAGE_SIZE) : memberships;
      const nextCursor = hasMore ? items[items.length - 1]?.circle_id : null;

      return reply.send({
        items: items.map((m) => serializeCircle(m.circle)),
        nextCursor: nextCursor ?? null,
        hasMore,
      });
    }
  );

  app.get(
    "/public",
    async (req, reply) => {
      const { category, search, cursor } = req.query as {
        category?: string;
        search?: string;
        cursor?: string;
      };

      const circles = await prisma.circle.findMany({
        where: {
          privacy: "public",
          ...(category && CIRCLE_CATEGORIES.includes(category as CircleCategory)
            ? { category }
            : {}),
          ...(search
            ? { name: { contains: search, mode: "insensitive" } }
            : {}),
        },
        take: PAGE_SIZE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { created_at: "desc" },
        include: { _count: { select: { members: true } } },
      });

      const hasMore = circles.length > PAGE_SIZE;
      const items = hasMore ? circles.slice(0, PAGE_SIZE) : circles;
      const nextCursor = hasMore ? items[items.length - 1]?.id : null;

      return reply.send({
        items: items.map((c) =>
          serializeCircle(c, c._count.members)
        ),
        nextCursor: nextCursor ?? null,
        hasMore,
      });
    }
  );

  app.get(
    "/:id",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const circle = await prisma.circle.findUnique({
        where: { id },
        include: {
          _count: { select: { members: true } },
          members: {
            take: 5,
            include: { user: true },
            orderBy: { joined_at: "asc" },
          },
        },
      });

      if (!circle) {
        return reply.status(404).send({
          error: "NotFound",
          message: "Circle not found",
          statusCode: 404,
        });
      }

      if (circle.privacy === "private") {
        const isMember = await prisma.circleMember.findUnique({
          where: {
            circle_id_user_id: { circle_id: id, user_id: req.jwtUser.sub },
          },
        });
        if (!isMember) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You are not a member of this circle",
            statusCode: 403,
          });
        }
      }

      return reply.send({
        ...serializeCircle(circle, circle._count.members),
        membersPreview: circle.members.map((m) => ({
          userId: m.user_id,
          role: m.role,
          joinedAt: m.joined_at,
          user: {
            id: m.user.id,
            walletAddress: m.user.wallet_address,
            name: m.user.name,
            username: m.user.username,
            avatarEmoji: m.user.avatar_emoji,
            avatarColor: m.user.avatar_color,
          },
        })),
      });
    }
  );

  app.post(
    "/",
    { preHandler: requireAuth },
    async (req, reply) => {
      const body = createCircleSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({
          error: "ValidationError",
          message: body.error.errors[0]?.message ?? "Invalid input",
          statusCode: 400,
        });
      }

      const inviteCode =
        body.data.privacy === "private"
          ? randomBytes(6).toString("base64url")
          : undefined;

      const circle = await prisma.$transaction(async (tx) => {
        const c = await tx.circle.create({
          data: {
            id: uuidv4(),
            chain_id: body.data.chainId ? BigInt(body.data.chainId) : null,
            owner_id: req.jwtUser.sub,
            name: body.data.name,
            description: body.data.description,
            category: body.data.category,
            privacy: body.data.privacy,
            invite_code: inviteCode,
            avatar_emoji: body.data.avatarEmoji,
            avatar_color: body.data.avatarColor,
          },
        });

        await tx.circleMember.create({
          data: { circle_id: c.id, user_id: req.jwtUser.sub, role: "owner" },
        });

        return c;
      });

      return reply.status(201).send(serializeCircle(circle));
    }
  );

  app.post(
    "/:id/join",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = joinCircleSchema.safeParse(req.body);

      const circle = await prisma.circle.findUnique({ where: { id } });
      if (!circle) {
        return reply.status(404).send({
          error: "NotFound",
          message: "Circle not found",
          statusCode: 404,
        });
      }

      if (circle.privacy === "private") {
        if (!body.data?.inviteCode || body.data.inviteCode !== circle.invite_code) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Invalid invite code",
            statusCode: 403,
          });
        }
      }

      const existing = await prisma.circleMember.findUnique({
        where: {
          circle_id_user_id: { circle_id: id, user_id: req.jwtUser.sub },
        },
      });

      if (existing) {
        return reply.send({ success: true, alreadyMember: true });
      }

      await prisma.circleMember.create({
        data: { circle_id: id, user_id: req.jwtUser.sub, role: "member" },
      });

      const notification = {
        id: uuidv4(),
        userId: circle.owner_id,
        type: "circle.joined",
        actorId: req.jwtUser.sub,
        entityType: "circle",
        entityId: id,
        title: "New member joined",
        description: "Someone joined your circle",
        unread: true,
        createdAt: new Date(),
      };
      await prisma.notification.create({
        data: {
          id: notification.id,
          user_id: circle.owner_id,
          type: notification.type,
          actor_id: req.jwtUser.sub,
          entity_type: "circle",
          entity_id: id,
          title: notification.title,
          description: notification.description,
        },
      });
      await publishNotification(circle.owner_id, notification);

      return reply.send({ success: true });
    }
  );

  app.delete(
    "/:id/leave",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const member = await prisma.circleMember.findUnique({
        where: {
          circle_id_user_id: { circle_id: id, user_id: req.jwtUser.sub },
        },
      });

      if (!member) {
        return reply.status(404).send({
          error: "NotFound",
          message: "You are not a member of this circle",
          statusCode: 404,
        });
      }

      if (member.role === "owner") {
        return reply.status(400).send({
          error: "BadRequest",
          message: "Circle owner cannot leave. Transfer ownership first.",
          statusCode: 400,
        });
      }

      await prisma.circleMember.delete({
        where: {
          circle_id_user_id: { circle_id: id, user_id: req.jwtUser.sub },
        },
      });

      return reply.send({ success: true });
    }
  );

  app.post(
    "/:id/invite",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const body = inviteSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({
          error: "ValidationError",
          message: body.error.errors[0]?.message ?? "Invalid input",
          statusCode: 400,
        });
      }

      const isMember = await prisma.circleMember.findUnique({
        where: {
          circle_id_user_id: { circle_id: id, user_id: req.jwtUser.sub },
        },
      });

      if (!isMember) {
        return reply.status(403).send({
          error: "Forbidden",
          message: "You must be a member to invite others",
          statusCode: 403,
        });
      }

      const circle = await prisma.circle.findUnique({ where: { id } });
      if (!circle) {
        return reply.status(404).send({
          error: "NotFound",
          message: "Circle not found",
          statusCode: 404,
        });
      }

      await Promise.all(
        body.data.userIds.map(async (userId) => {
          const notification = {
            id: uuidv4(),
            userId,
            type: "circle.invited",
            actorId: req.jwtUser.sub,
            entityType: "circle",
            entityId: id,
            title: "Circle Invitation",
            description: `You've been invited to join "${circle.name}"`,
            unread: true,
            createdAt: new Date(),
          };

          await prisma.notification.create({
            data: {
              id: notification.id,
              user_id: userId,
              type: notification.type,
              actor_id: req.jwtUser.sub,
              entity_type: "circle",
              entity_id: id,
              title: notification.title,
              description: notification.description,
            },
          });

          await publishNotification(userId, notification);
        })
      );

      return reply.send({ success: true });
    }
  );

  app.get(
    "/:id/members",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { cursor } = req.query as { cursor?: string };

      const isMember = await prisma.circleMember.findUnique({
        where: {
          circle_id_user_id: { circle_id: id, user_id: req.jwtUser.sub },
        },
      });

      if (!isMember) {
        const circle = await prisma.circle.findUnique({ where: { id } });
        if (!circle || circle.privacy === "private") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Not allowed",
            statusCode: 403,
          });
        }
      }

      const members = await prisma.circleMember.findMany({
        where: { circle_id: id },
        include: { user: true },
        take: PAGE_SIZE + 1,
        ...(cursor ? { cursor: { circle_id_user_id: { circle_id: id, user_id: cursor } }, skip: 1 } : {}),
        orderBy: { joined_at: "asc" },
      });

      const hasMore = members.length > PAGE_SIZE;
      const items = hasMore ? members.slice(0, PAGE_SIZE) : members;

      return reply.send({
        items: items.map((m) => ({
          userId: m.user_id,
          role: m.role,
          joinedAt: m.joined_at,
          user: {
            id: m.user.id,
            walletAddress: m.user.wallet_address,
            name: m.user.name,
            username: m.user.username,
            avatarEmoji: m.user.avatar_emoji,
            avatarColor: m.user.avatar_color,
          },
        })),
        nextCursor: hasMore ? items[items.length - 1]?.user_id : null,
        hasMore,
      });
    }
  );

  app.get(
    "/:id/goals",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { cursor, status } = req.query as { cursor?: string; status?: string };

      const circle = await prisma.circle.findUnique({ where: { id } });
      if (!circle) {
        return reply.status(404).send({
          error: "NotFound",
          message: "Circle not found",
          statusCode: 404,
        });
      }

      if (circle.privacy === "private") {
        const isMember = await prisma.circleMember.findUnique({
          where: {
            circle_id_user_id: { circle_id: id, user_id: req.jwtUser.sub },
          },
        });
        if (!isMember) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Not a member",
            statusCode: 403,
          });
        }
      }

      const goals = await prisma.goal.findMany({
        where: {
          circle_id: id,
          ...(status ? { status } : {}),
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
          id: g.id,
          chainId: g.chain_id?.toString() ?? null,
          circleId: g.circle_id,
          creatorId: g.creator_id,
          title: g.title,
          description: g.description,
          avatarEmoji: g.avatar_emoji,
          avatarColor: g.avatar_color,
          outcomeType: g.outcome_type,
          deadline: g.deadline,
          minStake: g.min_stake.toString(),
          status: g.status,
          winningSide: g.winning_side,
          participantCount: g._count.participants,
          createdAt: g.created_at,
        })),
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
        hasMore,
      });
    }
  );
}
