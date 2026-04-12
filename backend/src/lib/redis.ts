import Redis from "ioredis";
import { config } from "../config.js";

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(config.redisUrl, {
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
    subscriberInstance = new Redis(config.redisUrl, {
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
