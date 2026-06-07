import type { FastifyReply, FastifyRequest } from "fastify";
import type { JwtPayload } from "../../types/index.js";

/**
 * Module-augmentation that adds `req.jwtUser` to every FastifyRequest.
 *
 * `fastify-jwt` writes the verified payload to `req.user`, but our
 * route handlers prefer the typed alias `req.jwtUser` for consistency
 * with the rest of the codebase. The cast in `requireAuth` populates
 * both fields.
 */
declare module "fastify" {
  interface FastifyRequest {
    jwtUser: JwtPayload;
  }
}

/**
 * Fastify pre-handler hook that enforces a valid JWT on a route.
 *
 * On success, `req.jwtUser` holds the decoded payload and the request
 * continues. On any verification failure (missing token, expired,
 * malformed), the handler short-circuits with 401 and a JSON error
 * body matching the rest of our API envelope.
 *
 * Apply via `fastify.addHook("preHandler", requireAuth)` for
 * route-level enforcement, or wire it in the route options for
 * a single endpoint.
 */
export async function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await req.jwtVerify();
    req.jwtUser = req.user as JwtPayload;
  } catch {
    reply.status(401).send({
      error: "Unauthorized",
      message: "Missing or invalid access token",
      statusCode: 401,
    });
  }
}
