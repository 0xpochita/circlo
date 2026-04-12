import type { FastifyInstance } from "fastify";
import type { SocketStream } from "@fastify/websocket";
import Redis from "ioredis";
import { config } from "../config.js";
import type { JwtPayload } from "../types/index.js";

const userSockets = new Map<string, Set<any>>();
const userSubscriptions = new Map<string, Redis>();

const PING_INTERVAL = 30_000;

function getOrCreateSubscriber(userId: string): Redis {
  if (userSubscriptions.has(userId)) {
    return userSubscriptions.get(userId)!;
  }

  const sub = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  sub.subscribe(`notifications:${userId}`, (err) => {
    if (err) console.error(`[WS] Failed to subscribe for user ${userId}:`, err);
  });

  sub.on("message", (_channel: string, message: string) => {
    const sockets = userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    for (const ws of sockets) {
      try {
        if (ws.readyState === 1) {
          ws.send(message);
        }
      } catch {}
    }
  });

  userSubscriptions.set(userId, sub);
  return sub;
}

function removeSocket(userId: string, ws: any): void {
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
        ws.close(1008, "Missing token");
        return;
      }

      let payload: JwtPayload;
      try {
        payload = app.jwt.verify<JwtPayload>(token);
      } catch {
        ws.send(JSON.stringify({ error: "Unauthorized", message: "Invalid token" }));
        ws.close(1008, "Invalid token");
        return;
      }

      const userId = payload.sub;

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(ws);

      getOrCreateSubscriber(userId);

      console.log(`[WS] User ${userId} connected (${userSockets.get(userId)?.size} conn)`);

      const pingTimer = setInterval(() => {
        if (ws.readyState === 1) {
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
        console.log(`[WS] User ${userId} disconnected`);
      });

      ws.on("error", (err: Error) => {
        console.error(`[WS] Socket error for user ${userId}:`, err.message);
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
