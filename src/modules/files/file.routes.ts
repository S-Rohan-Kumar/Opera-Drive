import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { FileService } from "./file.services.js";
import { authenticate } from "../auth/auth.middleware.js";

export async function fileRoutes(app: FastifyInstance) {
    // Guard all file routes
    app.addHook("preHandler", authenticate);

    // 1. POST /upload (Single-part streaming multipart)
    app.post(
        "/upload",
        async (request: FastifyRequest, reply: FastifyReply) => {
            const part = await request.file();
            if (!part) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: "NO_FILE_UPLOADED",
                        message: "No file found in multipart upload",
                    },
                });
            }

            // Read optional parentId from multipart fields
            const parentIdField = part.fields.parentId as any;
            const parentId = parentIdField?.value
                ? String(parentIdField.value)
                : undefined;

            const result = await FileService.uploadSinglePart(
                request.user.id,
                part.file,
                part.filename,
                part.mimetype,
                parentId,
            );

            return reply.status(201).send({
                success: true,
                data: result,
            });
        },
    );

    // 2. GET /:id (Get file metadata)
    app.get(
        "/:id",
        async (
            request: FastifyRequest<{ Params: { id: string } }>,
            reply: FastifyReply,
        ) => {
            const file = await FileService.getFile(
                request.user.id,
                request.params.id,
            );
            return reply.send({ success: true, data: { file } });
        },
    );

    // 3. GET /:id/download (Stream file bytes back to client)
    app.get(
        "/:id/download",
        async (
            request: FastifyRequest<{ Params: { id: string } }>,
            reply: FastifyReply,
        ) => {
            const { stream, filename, mimeType, sizeBytes } =
                await FileService.getDownloadStream(
                    request.user.id,
                    request.params.id,
                );

            reply.header("Content-Type", mimeType);
            reply.header("Content-Length", sizeBytes);
            reply.header(
                "Content-Disposition",
                `inline; filename="${encodeURIComponent(filename)}"`,
            );

            return reply.send(stream);
        },
    );

    // 4. DELETE /:id (Soft Delete)
    app.delete(
        "/:id",
        async (
            request: FastifyRequest<{ Params: { id: string } }>,
            reply: FastifyReply,
        ) => {
            await FileService.delete(request.user.id, request.params.id);
            return reply.status(204).send();
        },
    );
    // 5. GET /:id/versions (List version history)
    app.get(
        "/:id/versions",
        async (
            request: FastifyRequest<{ Params: { id: string } }>,
            reply: FastifyReply,
        ) => {
            const result = await FileService.listVersions(
                request.user.id,
                request.params.id,
            );
            return reply.send({ success: true, data: result });
        },
    );

    // 6. GET /:id/versions/:vId/download (Stream specific version)
    app.get(
        "/:id/versions/:vId/download",
        async (
            request: FastifyRequest<{ Params: { id: string; vId: string } }>,
            reply: FastifyReply,
        ) => {
            const { stream, filename, mimeType, sizeBytes } =
                await FileService.getVersionDownloadStream(
                    request.user.id,
                    request.params.id,
                    request.params.vId,
                );

            reply.header("Content-Type", mimeType);
            reply.header("Content-Length", sizeBytes);
            reply.header(
                "Content-Disposition",
                `inline; filename="${encodeURIComponent(filename)}"`,
            );

            return reply.send(stream);
        },
    );

    // 7. POST /:id/versions/:vId/rollback (Rollback to historical version)
    app.post(
        "/:id/versions/:vId/rollback",
        async (
            request: FastifyRequest<{ Params: { id: string; vId: string } }>,
            reply: FastifyReply,
        ) => {
            const result = await FileService.rollbackVersion(
                request.user.id,
                request.params.id,
                request.params.vId,
            );
            return reply.send({ success: true, data: result });
        },
    );
}
