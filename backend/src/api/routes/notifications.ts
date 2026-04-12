import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";

const PAGE_SIZE = 30;

const markReadSchema = z
  .object({
    ids: z.array(z.string().uuid()).optional(),
    all: z.boolean().optional(),
  })
  .refine((d) => d.ids || d.all, {
    message: "Provide either 'ids' array or 'all: true'",
  });

export default async function notificationRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { cursor, unreadOnly } = req.query as {
        cursor?: string;
        unreadOnly?: string;
      };

      const notifications = await prisma.notification.findMany({
        where: {
          user_id: req.jwtUser.sub,
          ...(unreadOnly === "true" ? { unread: true } : {}),
        },
        take: PAGE_SIZE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { created_at: "desc" },
        include: {
          actor: {
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

      const hasMore = notifications.length > PAGE_SIZE;
      const items = hasMore ? notifications.slice(0, PAGE_SIZE) : notifications;

      const unreadCount = await prisma.notification.count({
        where: { user_id: req.jwtUser.sub, unread: true },
      });

      return reply.send({
        items: items.map((n) => ({
          id: n.id,
          type: n.type,
          actorId: n.actor_id,
          entityType: n.entity_type,
          entityId: n.entity_id,
          title: n.title,
          description: n.description,
          unread: n.unread,
          createdAt: n.created_at,
          actor: n.actor
            ? {
                id: n.actor.id,
                walletAddress: n.actor.wallet_address,
                name: n.actor.name,
                username: n.actor.username,
                avatarEmoji: n.actor.avatar_emoji,
                avatarColor: n.actor.avatar_color,
              }
            : null,
        })),
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
        hasMore,
        unreadCount,
      });
    }
  );

  app.post(
    "/mark-read",
    { preHandler: requireAuth },
    async (req, reply) => {
      const body = markReadSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({
          error: "ValidationError",
          message: body.error.errors[0]?.message ?? "Invalid input",
          statusCode: 400,
        });
      }

      if (body.data.all) {
        await prisma.notification.updateMany({
          where: { user_id: req.jwtUser.sub, unread: true },
          data: { unread: false },
        });
      } else if (body.data.ids) {
        await prisma.notification.updateMany({
          where: {
            id: { in: body.data.ids },
            user_id: req.jwtUser.sub,
          },
          data: { unread: false },
        });
      }

      return reply.send({ success: true });
    }
  );
}
