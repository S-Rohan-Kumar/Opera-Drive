import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import { authenticate } from './auth.middleware.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = registerSchema.parse(request.body);
    const user = await AuthService.register(input);
    const token = app.jwt.sign(
      { id: user.id, email: user.email },
      { expiresIn: '7d' }
    );

    return reply.status(201).send({
      success: true,
      data: { user, token },
    });
  });

  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = loginSchema.parse(request.body);
    const user = await AuthService.validateCredentials(input);
    const token = app.jwt.sign(
      { id: user.id, email: user.email },
      { expiresIn: '7d' }
    );

    return reply.send({
      success: true,
      data: { user, token },
    });
  });

  app.get('/me', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await AuthService.findById(request.user.id);
    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    return reply.send({
      success: true,
      data: { user },
    });
  });
}
