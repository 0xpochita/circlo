import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import fastifyWebsocket from "@fastify/websocket";
import fastifyRateLimit from "@fastify/rate-limit";
import { config } from "../config.js";
import { redis } from "../lib/redis.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import circleRoutes from "./routes/circles.js";
import goalRoutes from "./routes/goals.js";
import notificationRoutes from "./routes/notifications.js";
import referralRoutes from "./routes/referrals.js";
import systemRoutes from "./routes/system.js";
import { registerWsGateway } from "../ws/gateway.js";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.isDevelopment ? "info" : "warn",
      transport: config.isDevelopment
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    },
  });

  await app.register(fastifyCors, {
    origin: config.frontendOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(fastifyCookie);

  await app.register(fastifyJwt, {
    secret: config.jwtSecret,
    cookie: {
      cookieName: "refreshToken",
      signed: false,
    },
  });

  await app.register(fastifyWebsocket);

  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
    redis: redis as any,
    keyGenerator: (req) =>
      req.headers["x-forwarded-for"]?.toString() ?? req.ip,
    errorResponseBuilder: (_req, context) => ({
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${context.after}`,
      statusCode: 429,
    }),
  });

  app.setErrorHandler((error, _req, reply) => {
    const statusCode = error.statusCode ?? 500;
    const isDev = config.isDevelopment;

    app.log.error(error);

    reply.status(statusCode).send({
      error: error.name ?? "InternalServerError",
      message:
        statusCode < 500 || isDev
          ? error.message
          : "An internal server error occurred",
      statusCode,
    });
  });

  await app.register(systemRoutes);
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(userRoutes, { prefix: "/api/v1/users" });
  await app.register(circleRoutes, { prefix: "/api/v1/circles" });
  await app.register(goalRoutes, { prefix: "/api/v1/goals" });
  await app.register(notificationRoutes, { prefix: "/api/v1/notifications" });
  await app.register(referralRoutes, { prefix: "/api/v1/referrals" });

  registerWsGateway(app);

  return app;
}
