import fastify, {
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { env } from "./config/env.js";
import { testDbConnection } from "./db/client.js";
import { testMinioConnection } from "./storage/minio.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { folderRoutes } from "./modules/folders/folder.routes.js";
import { fileRoutes } from "./modules/files/file.routes.js";
import { resumableRoutes } from "./modules/files/resumable.routes.js";

export async function buildServer(): Promise<FastifyInstance> {
    const app = fastify({
        logger:
            env.NODE_ENV === "development"
                ? {
                      transport: {
                          target: "pino-pretty",
                          options: {
                              colorize: true,
                              translateTime: "HH:MM:ss Z",
                              ignore: "pid,hostname",
                          },
                      },
                  }
                : true,
    });

    app.setErrorHandler(
        (error: any, request: FastifyRequest, reply: FastifyReply) => {
            request.log.error(error);

            const statusCode = error.statusCode || 500;
            const errorCode = error.code || "INTERNAL_SERVER_ERROR";

            return reply.status(statusCode).send({
                success: false,
                error: {
                    code: errorCode,
                    message:
                        statusCode === 500 && env.NODE_ENV === "production"
                            ? "Internal server error"
                            : error.message,
                },
                requestId: request.id,
            });
        },
    );

    await app.register(cors, {
        origin: true,
        credentials: true,
    });

    await app.register(jwt, {
        secret: env.JWT_SECRET,
    });
    app.addContentTypeParser(
        "application/octet-stream",
        { parseAs: "buffer" },
        (_req, body, done) => {
            done(null, body);
        },
    );
    await app.register(multipart, {
        limits: {
            fileSize: 100 * 1024 * 1024,
            files: 1,
        },
    });

    await app.register(authRoutes, { prefix: "/api/v1/auth" });
    await app.register(folderRoutes, { prefix: "/api/v1/folders" });
    await app.register(fileRoutes, { prefix: "/api/v1/files" });
    await app.register(resumableRoutes, { prefix: "/api/v1/files/resumable" });

    app.get("/health", async (_req: FastifyRequest, reply: FastifyReply) => {
        const [dbOk, minioOk] = await Promise.all([
            testDbConnection(),
            testMinioConnection(),
        ]);

        const isHealthy = dbOk && minioOk;

        return reply.status(isHealthy ? 200 : 503).send({
            status: isHealthy ? "healthy" : "degraded",
            services: {
                database: dbOk ? "up" : "down",
                storage: minioOk ? "up" : "down",
            },
            timestamp: new Date().toISOString(),
        });
    });

    return app;
}
