import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FolderService } from './folder.service.js';
import { createFolderSchema, updateFolderSchema } from './folder.schema.js';
import { authenticate } from '../auth/auth.middleware.js';

export async function folderRoutes(app: FastifyInstance) {
  // All folder routes require authentication
  app.addHook('preHandler', authenticate);

  // 1. POST / (Create Folder)
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = createFolderSchema.parse(request.body);
    const folder = await FolderService.create(request.user.id, input);
    return reply.status(201).send({ success: true, data: { folder } });
  });

  // 2. GET /:id/contents (List contents: pass 'root' or UUID)
  app.get('/:id/contents', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const contents = await FolderService.listContents(request.user.id, request.params.id);
    return reply.send({ success: true, data: contents });
  });

  // 3. PATCH /:id (Rename or Move)
  app.patch('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const input = updateFolderSchema.parse(request.body);
    const folder = await FolderService.update(request.user.id, request.params.id, input);
    return reply.send({ success: true, data: { folder } });
  });

  // 4. DELETE /:id (Soft Delete)
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await FolderService.delete(request.user.id, request.params.id);
    return reply.status(204).send();
  });
}