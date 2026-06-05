import { PrismaClient } from "@prisma/client";
import { config } from "../config.js";

/**
 * Cache the PrismaClient instance on `globalThis` in non-production
 * so hot-reload (tsx watch, jest, ts-node) doesn't spawn a new pool
 * for every file edit — which causes `too many connections` errors
 * from Postgres after a few dozen reloads.
 *
 * In production we want a single fresh client per process; the
 * cache is a dev-time convenience only.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Project-wide Prisma client.
 *
 * Logs queries + warnings in development for fast schema iteration;
 * errors only in production to keep logs scannable. Import this
 * instead of constructing a new PrismaClient at any call site.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDevelopment ? ["query", "error", "warn"] : ["error"],
  });

if (!config.isProduction) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
