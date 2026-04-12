import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";

const updateMeSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Username must be alphanumeric + underscore only")
    .optional(),
  avatarEmoji: z.string().max(10).optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional(),
});

function serializeUser(user: {
  id: string;
  wallet_address: string;
  name: string | null;
  username: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: user.id,
    walletAddress: user.wallet_address,
    name: user.name,
    username: user.username,
    avatarEmoji: user.avatar_emoji,
    avatarColor: user.avatar_color,
    createdAt: user.created_at,
  };
}

export default async function userRoutes(app: FastifyInstance) {
  app.get(
    "/me",
    { preHandler: requireAuth },
    async (req, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: req.jwtUser.sub },
      });

      if (!user) {
        return reply.status(404).send({
          error: "NotFound",
          message: "User not found",
          statusCode: 404,
        });
      }

      return reply.send(serializeUser(user));
    }
  );

  app.patch(
    "/me",
    { preHandler: requireAuth },
    async (req, reply) => {
      const body = updateMeSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({
          error: "ValidationError",
          message: body.error.errors[0]?.message ?? "Invalid input",
          statusCode: 400,
        });
      }

      if (body.data.username) {
        const existing = await prisma.user.findFirst({
          where: {
            username: body.data.username,
            id: { not: req.jwtUser.sub },
          },
        });
        if (existing) {
          return reply.status(409).send({
            error: "Conflict",
            message: "Username already taken",
            statusCode: 409,
          });
        }
      }

      const updated = await prisma.user.update({
        where: { id: req.jwtUser.sub },
        data: {
          name: body.data.name,
          username: body.data.username,
          avatar_emoji: body.data.avatarEmoji,
          avatar_color: body.data.avatarColor,
        },
      });

      return reply.send(serializeUser(updated));
    }
  );

  app.get(
    "/search",
    { preHandler: requireAuth },
    async (req, reply) => {
      const q = (req.query as Record<string, string>).q ?? "";
      if (q.length < 2) {
        return reply.send([]);
      }

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { wallet_address: { contains: q.toLowerCase() } },
          ],
          id: { not: req.jwtUser.sub },
        },
        take: 20,
      });

      return reply.send(users.map(serializeUser));
    }
  );

  app.get(
    "/:walletAddress",
    async (req, reply) => {
      const { walletAddress } = req.params as { walletAddress: string };

      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return reply.status(400).send({
          error: "ValidationError",
          message: "Invalid wallet address",
          statusCode: 400,
        });
      }

      const user = await prisma.user.findUnique({
        where: { wallet_address: walletAddress.toLowerCase() },
      });

      if (!user) {
        return reply.status(404).send({
          error: "NotFound",
          message: "User not found",
          statusCode: 404,
        });
      }

      return reply.send(serializeUser(user));
    }
  );
}
