import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../auth/auth.middleware.js";
import { ResumableService } from "./resumable.services.js";
import {
    initiateSessionSchema,
    sessionParamSchema,
    partParamSchema,
} from "./resumable.schema.js";

export async function resumableRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authenticate);

    app.post(
        "/initiate",
        async (request: FastifyRequest, reply: FastifyReply) => {
            const validated = initiateSessionSchema.parse(request.body);
            const session = await ResumableService.initiate(
                request.user.id,
                validated,
            );
            return reply.status(201).send({
                success: true,
                data: { session },
            });
        },
    );

    app.put(
        "/:id/parts/:partNumber",
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { id, partNumber } = partParamSchema.parse(request.params);

            if (!Buffer.isBuffer(request.body)) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: "INVALID_BODY",
                        message: "Request body must be raw binary buffer",
                    },
                });
            }

            const result = await ResumableService.uploadPart(
                request.user.id,
                id,
                partNumber,
                request.body,
            );

            return reply.status(200).send({
                success: true,
                data: result,
            });
        },
    );

    app.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = sessionParamSchema.parse(request.params);
        const result = await ResumableService.getSessionStatus(
            request.user.id,
            id,
        );
        return reply.status(200).send({
            success: true,
            data: result,
        });
    });

    app.post(
        "/:id/complete",
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { id } = sessionParamSchema.parse(request.params);
            const result = await ResumableService.finalizeSession(
                request.user.id,
                id,
            );
            return reply.status(200).send({
                success: true,
                data: result,
            });
        },
    );

    app.delete("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = sessionParamSchema.parse(request.params);
        const result = await ResumableService.abortSession(request.user.id, id);
        return reply.status(200).send({
            success: true,
            data: result,
        });
    });
}
