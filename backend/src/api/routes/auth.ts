import type { FastifyInstance } from "fastify";
import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { SiweMessage } from "siwe";
import { verifyMessage } from "viem";
import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../config.js";

const NONCE_TTL = 300;
const NONCE_RATE_KEY = "rate:nonce:";
const NONCE_RATE_LIMIT = 10;
const NONCE_RATE_WINDOW = 60;

const nonceSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

const verifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature"),
});

async function checkNonceRateLimit(ip: string): Promise<boolean> {
  const key = `${NONCE_RATE_KEY}${ip}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, NONCE_RATE_WINDOW);
  }
  return current <= NONCE_RATE_LIMIT;
}

export default async function authRoutes(app: FastifyInstance) {
  app.post("/nonce", async (req, reply) => {
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      req.ip;

    const allowed = await checkNonceRateLimit(ip);
    if (!allowed) {
      return reply.status(429).send({
        error: "TooManyRequests",
        message: "Too many nonce requests. Try again in a minute.",
        statusCode: 429,
      });
    }

    const body = nonceSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({
        error: "ValidationError",
        message: body.error.errors[0]?.message ?? "Invalid input",
        statusCode: 400,
      });
    }

    const walletAddress = body.data.walletAddress.toLowerCase();
    const nonce = randomBytes(16).toString("hex");

    await redis.setex(`nonce:${walletAddress}`, NONCE_TTL, nonce);

    return reply.send({ nonce });
  });

  app.post("/verify", async (req, reply) => {
    const body = verifySchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({
        error: "ValidationError",
        message: body.error.errors[0]?.message ?? "Invalid input",
        statusCode: 400,
      });
    }

    const { message, signature } = body.data;

    let siweMessage: SiweMessage;
    try {
      siweMessage = new SiweMessage(message);
    } catch {
      return reply.status(400).send({
        error: "InvalidMessage",
        message: "Could not parse SIWE message",
        statusCode: 400,
      });
    }

    const walletAddress = siweMessage.address.toLowerCase();

    const storedNonce = await redis.get(`nonce:${walletAddress}`);
    if (!storedNonce || storedNonce !== siweMessage.nonce) {
      return reply.status(401).send({
        error: "InvalidNonce",
        message: "Nonce is invalid or expired",
        statusCode: 401,
      });
    }

    const validChainIds = [config.celoChainId, config.celoChainIdTestnet];
    if (siweMessage.chainId && !validChainIds.includes(siweMessage.chainId)) {
      return reply.status(401).send({
        error: "InvalidChain",
        message: "Unsupported chain ID",
        statusCode: 401,
      });
    }

    let isValid = false;
    try {
      isValid = await verifyMessage({
        address: siweMessage.address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    } catch {
      isValid = false;
    }

    if (!isValid) {
      return reply.status(401).send({
        error: "InvalidSignature",
        message: "Signature verification failed",
        statusCode: 401,
      });
    }

    await redis.del(`nonce:${walletAddress}`);

    app.log.info(
      { wallet: walletAddress, sigHash: signature.slice(0, 10) },
      "SIWE verify success"
    );

    const user = await prisma.user.upsert({
      where: { wallet_address: walletAddress },
      create: {
        id: uuidv4(),
        wallet_address: walletAddress,
      },
      update: {
        updated_at: new Date(),
      },
    });

    const accessToken = app.jwt.sign(
      { sub: user.id, wallet: user.wallet_address },
      { expiresIn: "1h" }
    );

    const refreshToken = app.jwt.sign(
      { sub: user.id, wallet: user.wallet_address, type: "refresh" },
      { expiresIn: "30d" }
    );

    reply.setCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: 30 * 24 * 60 * 60,
    });

    return reply.send({
      accessToken,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        name: user.name,
        username: user.username,
        avatarEmoji: user.avatar_emoji,
        avatarColor: user.avatar_color,
        createdAt: user.created_at,
      },
    });
  });

  app.post("/refresh", async (req, reply) => {
    const cookieToken = req.cookies?.refreshToken;
    if (!cookieToken) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "No refresh token",
        statusCode: 401,
      });
    }

    let payload: { sub: string; wallet: string; type?: string };
    try {
      payload = app.jwt.verify<{ sub: string; wallet: string; type?: string }>(
        cookieToken
      );
    } catch {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid or expired refresh token",
        statusCode: 401,
      });
    }

    if (payload.type !== "refresh") {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Not a refresh token",
        statusCode: 401,
      });
    }

    const accessToken = app.jwt.sign(
      { sub: payload.sub, wallet: payload.wallet },
      { expiresIn: "1h" }
    );

    return reply.send({ accessToken });
  });

  app.post("/logout", async (_req, reply) => {
    reply.clearCookie("refreshToken", { path: "/api/v1/auth" });
    return reply.send({ success: true });
  });
}
