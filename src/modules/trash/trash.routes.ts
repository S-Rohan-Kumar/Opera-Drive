import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth/auth.middleware.js";
import { TrashService } from "./trash.service.js";

const restoreSchema = z.object({
    resourceType: z.enum(["file", "folder"]),
    id: z.string().uuid(),
});

export async function trashRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authenticate);

    app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
        const data = await TrashService.listTrash(request.user.id);
        return reply.send({ success: true, data });
    });

    app.post(
        "/restore",
        async (
            request: FastifyRequest<{ Body: z.infer<typeof restoreSchema> }>,
            reply: FastifyReply,
        ) => {
            const parsed = restoreSchema.parse(request.body);
            const result = await TrashService.restore(
                request.user.id,
                parsed.resourceType,
                parsed.id,
            );
            return reply.send({ success: true, data: result });
        },
    );

    app.delete(
        "/:resourceType/:id",
        async (
            request: FastifyRequest<{
                Params: { resourceType: "file" | "folder"; id: string };
            }>,
            reply: FastifyReply,
        ) => {
            const { resourceType, id } = request.params;
            const result = await TrashService.permanentlyDelete(
                request.user.id,
                resourceType,
                id,
            );
            return reply.send({ success: true, data: result });
        },
    );

    app.delete("/", async (request: FastifyRequest, reply: FastifyReply) => {
        const result = await TrashService.emptyTrash(request.user.id);
        return reply.send({ success: true, data: result });
    });
}
