import type { FastifyInstance } from "fastify";
import type { SocketStream } from "@fastify/websocket";
import type WebSocket from "ws";
import Redis from "ioredis";
import { config } from "../config.js";
import { parseRedisUrl } from "../lib/redis.js";
import type { JwtPayload } from "../types/index.js";

/**
 * Per-user fan-out registry: maps `userId` → set of active websocket
 * connections. A user can be online from multiple devices; every
 * notification gets pushed to all of them.
 */
const userSockets = new Map<string, Set<WebSocket>>();

/**
 * Per-user Redis subscriber registry: maps `userId` → an ioredis
 * client subscribed to `notifications:{userId}`. Created lazily on
 * first connection, destroyed when the user's last socket closes.
 *
 * Why per-user (vs. one shared subscriber): ioredis enters
 * subscribe-mode on a per-connection basis. A single shared
 * subscriber would block new subscribe calls during pattern
 * resync; per-user clients keep the fan-out independent.
 */
const userSubscriptions = new Map<string, Redis>();

/**
 * Ping interval (ms). Sends a heartbeat frame every 30s to keep
 * idle connections alive through corporate / cloud proxies that
 * close TCP streams after ~60s of silence.
 */
const PING_INTERVAL = 30_000;
const WS_CLOSE_POLICY_VIOLATION = 1008;
const WS_READY_STATE_OPEN = 1;

/**
 * Lazily construct (or return cached) Redis subscriber for a user's
 * notification channel.
 *
 * On message receipt, fans out to every active socket in
 * `userSockets[userId]`. Sockets in non-OPEN state (`readyState !== 1`)
 * are skipped silently — they'll be cleaned up by `removeSocket` when
 * the close event fires.
 *
 * `maxRetriesPerRequest: null` here (vs. the primary client's `3`)
 * because subscriber-mode commands can't time out the same way —
 * SUBSCRIBE blocks indefinitely and the client must stay alive
 * through any transient blip.
 */
function getOrCreateSubscriber(userId: string): Redis {
  if (userSubscriptions.has(userId)) {
    return userSubscriptions.get(userId)!;
  }

  const sub = new Redis({
    ...parseRedisUrl(config.redisUrl),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  sub.subscribe(`notifications:${userId}`, (err) => {
    if (err) process.stderr.write(`[WS] subscribe fail ${userId}: ${err.message}\n`);
  });

  sub.on("message", (_channel: string, message: string) => {
    const sockets = userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    for (const ws of sockets) {
      try {
        if (ws.readyState === WS_READY_STATE_OPEN) {
          ws.send(message);
        }
      } catch {}
    }
  });

  userSubscriptions.set(userId, sub);
  return sub;
}

/**
 * Remove a websocket from a user's socket set and tear down the
 * per-user Redis subscriber if no sockets remain.
 *
 * Avoiding the subscriber teardown on EVERY disconnect (i.e. when
 * other devices stay connected) is important: SUBSCRIBE/UNSUBSCRIBE
 * are not free, and bouncing a single device shouldn't reset the
 * subscription for all of the user's other sessions.
 */
function removeSocket(userId: string, ws: WebSocket): void {
  const sockets = userSockets.get(userId);
  if (!sockets) return;

  sockets.delete(ws);

  if (sockets.size === 0) {
    userSockets.delete(userId);

    const sub = userSubscriptions.get(userId);
    if (sub) {
      sub.unsubscribe(`notifications:${userId}`).catch(() => {});
      sub.quit().catch(() => {});
      userSubscriptions.delete(userId);
    }
  }
}

export function registerWsGateway(app: FastifyInstance): void {
  app.get(
    "/ws/notifications",
    { websocket: true },
    (connection: SocketStream, req) => {
      const ws = connection.socket;
      const token = (req.query as Record<string, string>).token;

      if (!token) {
        ws.send(JSON.stringify({ error: "Unauthorized", message: "Missing token" }));
        ws.close(WS_CLOSE_POLICY_VIOLATION, "Missing token");
        return;
      }

      let payload: JwtPayload;
      try {
        payload = app.jwt.verify<JwtPayload>(token);
      } catch {
        ws.send(JSON.stringify({ error: "Unauthorized", message: "Invalid token" }));
        ws.close(WS_CLOSE_POLICY_VIOLATION, "Invalid token");
        return;
      }

      const userId = payload.sub;

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(ws);

      getOrCreateSubscriber(userId);

      app.log.info(`[WS] user ${userId} connected (${userSockets.get(userId)?.size} conn)`);

      const pingTimer = setInterval(() => {
        if (ws.readyState === WS_READY_STATE_OPEN) {
          ws.ping();
        }
      }, PING_INTERVAL);

      ws.on("pong", () => {});

      ws.on("message", (raw: Buffer | string) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type?: string };
          if (msg.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          }
        } catch {}
      });

      ws.on("close", () => {
        clearInterval(pingTimer);
        removeSocket(userId, ws);
        app.log.debug(`[WS] user ${userId} disconnected`);
      });

      ws.on("error", (err: Error) => {
        app.log.error(`[WS] socket error for user ${userId}: ${err.message}`);
        clearInterval(pingTimer);
        removeSocket(userId, ws);
      });

      ws.send(JSON.stringify({
        type: "connected",
        message: "Connected to Circlo notifications",
        userId,
      }));
    }
  );
}
