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

/**
 * Lazily construct the primary Redis client and reuse it across the
 * process. Used for cache reads/writes, rate-limit counters, and
 * `PUBLISH` calls on the websocket gateway.
 *
 * Wires three event handlers to surface connection issues in logs
 * without crashing the process — Redis blips are recoverable, so we
 * log and reconnect rather than abort. The retry cap (3) means a
 * single command will fail after ~3s of downtime rather than hanging.
 */
export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      ...parseRedisUrl(config.redisUrl),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisInstance.on("connect", () => {
      process.stdout.write("[Redis] connected\n");
    });

    redisInstance.on("error", (err) => {
      process.stderr.write(`[Redis] error: ${err.message}\n`);
    });

    redisInstance.on("reconnecting", () => {
      process.stdout.write("[Redis] reconnecting\n");
    });
  }

  return redisInstance;
}

let subscriberInstance: Redis | null = null;

/**
 * Lazily construct a SECOND Redis client used exclusively for
 * `SUBSCRIBE` (websocket fan-out).
 *
 * Why a separate client: ioredis enters subscribe mode after the
 * first `SUBSCRIBE` and refuses all non-pub/sub commands on that
 * connection. Mixing `GET`/`PUBLISH` with subscriptions on the same
 * client throws — hence the split.
 */
export function getSubscriber(): Redis {
  if (!subscriberInstance) {
    subscriberInstance = new Redis({
      ...parseRedisUrl(config.redisUrl),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    subscriberInstance.on("connect", () => {
      process.stdout.write("[Redis:Sub] connected\n");
    });

    subscriberInstance.on("error", (err) => {
      process.stderr.write(`[Redis:Sub] error: ${err.message}\n`);
    });
  }

  return subscriberInstance;
}

export const redis = getRedis();
export default redis;
