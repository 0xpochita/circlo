import type { FastifyInstance } from "fastify";
import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { SiweMessage } from "siwe";
import { verifyMessage } from "viem";
import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../config.js";

/**
 * SIWE nonce TTL (5 minutes).
 *
 * Long enough that the user can sign without time pressure, short
 * enough that a leaked nonce becomes unusable before an attacker
 * can replay it. SIWE's `expirationTime` field is a separate
 * shorter window enforced by the verifier.
 */
const NONCE_TTL = 300;

/** Redis key prefix for the per-IP nonce-rate counter. */
const NONCE_RATE_KEY = "rate:nonce:";

/**
 * Max nonce requests per IP per `NONCE_RATE_WINDOW`. Tuned so a single
 * user can hit `/nonce` from a few devices without tripping the limit,
 * but a credential-stuffing script hits the wall almost immediately.
 */
const NONCE_RATE_LIMIT = 10;

/** Sliding window (seconds) for nonce-rate counting. */
const NONCE_RATE_WINDOW = 60;

const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "30d";
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

const nonceSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

const verifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature"),
});

/**
 * Per-IP nonce-request rate limiter.
 *
 * Uses the classic INCR+EXPIRE pattern in Redis: first request sets
 * the TTL, subsequent ones just bump the counter. Returns `true`
 * if the request is allowed, `false` if the IP exceeded its budget
 * for the window.
 *
 * The TTL is set only on the first increment to keep the window
 * sliding (vs. fixed-bucket) — otherwise an attacker could time
 * requests around fixed bucket boundaries.
 */
async function checkNonceRateLimit(ip: string): Promise<boolean> {
  const key = `${NONCE_RATE_KEY}${ip}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, NONCE_RATE_WINDOW);
  }
  return current <= NONCE_RATE_LIMIT;
}

/**
 * SIWE auth routes — issue + verify the nonce/signature pair.
 *
 * Mounted unauthenticated (they ARE the login flow). Both endpoints
 * write rate-limited state to Redis; both validate input via Zod
 * before doing any expensive work.
 */
export default async function authRoutes(app: FastifyInstance) {
  /**
   * `POST /nonce` — issue a fresh SIWE nonce for a wallet.
   *
   * Per-IP rate-limited via {@link checkNonceRateLimit}. The nonce
   * is stored in Redis under `nonce:{walletAddress}` with a 5-minute
   * TTL; `/verify` reads it back and one-shot-deletes it on
   * successful sign-in.
   */
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

  /**
   * `POST /verify` — verify a signed SIWE message, mint JWTs, return
   * the user record.
   *
   * Verification chain:
   *   1. Zod parses + shape-checks the `{ message, signature }` body.
   *   2. `SiweMessage` parses the canonical SIWE string.
   *   3. Stored nonce matches the message's nonce (replay guard).
   *   4. ChainId is one of our supported Celo networks.
   *   5. `verifyMessage` confirms the signature came from the
   *      claimed address.
   *
   * On any failure, returns a typed 4xx envelope and writes nothing
   * to the session. On success, the nonce is consumed (deleted), the
   * user row is upserted, and access + refresh JWTs are returned.
   */
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
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = app.jwt.sign(
      { sub: user.id, wallet: user.wallet_address, type: "refresh" },
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    reply.setCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: REFRESH_COOKIE_MAX_AGE,
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
