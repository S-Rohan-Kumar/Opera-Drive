import { FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/jwt';

export interface TokenPayload {
  id: string;
  email: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: TokenPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authentication token',
      },
      requestId: request.id,
    });
  }
}
