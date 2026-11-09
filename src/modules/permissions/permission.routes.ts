import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../auth/auth.middleware.js";
import { PermissionService } from "./permission.service.js";
import {
    shareResourceSchema,
    resourceParamSchema,
    permissionIdParamSchema,
} from "./permission.schema.js";

export async function permissionRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authenticate);

    // 1. POST /share
    app.post("/share", async (request: FastifyRequest, reply: FastifyReply) => {
        const validated = shareResourceSchema.parse(request.body);
        const result = await PermissionService.share(request.user.id, validated);
        return reply.status(201).send({ success: true, data: result });
    });

    // 2. GET /shared-with-me
    app.get("/shared-with-me", async (request: FastifyRequest, reply: FastifyReply) => {
        const result = await PermissionService.getSharedWithMe(request.user.id);
        return reply.status(200).send({ success: true, data: result });
    });

    // 3. GET /:resourceType/:resourceId
    app.get("/:resourceType/:resourceId", async (request: FastifyRequest, reply: FastifyReply) => {
        const { resourceType, resourceId } = resourceParamSchema.parse(request.params);
        const result = await PermissionService.listResourcePermissions(
            request.user.id,
            resourceType,
            resourceId
        );
        return reply.status(200).send({ success: true, data: { permissions: result } });
    });

    // 4. DELETE /:id
    app.delete("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = permissionIdParamSchema.parse(request.params);
        const result = await PermissionService.revoke(request.user.id, id);
        return reply.status(200).send({ success: true, data: result });
    });
}