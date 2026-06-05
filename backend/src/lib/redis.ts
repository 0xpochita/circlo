import Redis from "ioredis";
import { config } from "../config.js";

/**
 * Parse a `redis://[user:pass@]host[:port]` URL into the options
 * shape ioredis's constructor expects.
 *
 * Defaults the port to `6379` when missing and `decodeURIComponent`s
 * the credentials — needed because cloud Redis providers (Upstash,
 * Aiven, Redis Cloud) often URL-encode passwords with `+` / `/`
 * characters that would otherwise corrupt the auth token.
 *
 * Omits the `username` / `password` keys entirely when absent so
 * ioredis doesn't try to auth against a local Redis that doesn't
 * have ACL enabled.
 */
export function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
  };
}

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      ...parseRedisUrl(config.redisUrl),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisInstance.on("connect", () => {
      console.log("[Redis] Connected");
    });

    redisInstance.on("error", (err) => {
      console.error("[Redis] Error:", err.message);
    });

    redisInstance.on("reconnecting", () => {
      console.log("[Redis] Reconnecting...");
    });
  }

  return redisInstance;
}

let subscriberInstance: Redis | null = null;

export function getSubscriber(): Redis {
  if (!subscriberInstance) {
    subscriberInstance = new Redis({
      ...parseRedisUrl(config.redisUrl),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    subscriberInstance.on("connect", () => {
      console.log("[Redis:Sub] Connected");
    });

    subscriberInstance.on("error", (err) => {
      console.error("[Redis:Sub] Error:", err.message);
    });
  }

  return subscriberInstance;
}

export const redis = getRedis();
export default redis;
