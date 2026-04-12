import type { FastifyReply, FastifyRequest } from "fastify";
import type { JwtPayload } from "../../types/index.js";

declare module "fastify" {
  interface FastifyRequest {
    jwtUser: JwtPayload;
  }
}

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
