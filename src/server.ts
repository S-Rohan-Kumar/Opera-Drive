import fastify, {
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import websocket from '@fastify/websocket';
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { redisClient } from "./queue/redis.js";
import { env } from "./config/env.js";
import { testDbConnection } from "./db/client.js";
import { testMinioConnection } from "./storage/minio.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { folderRoutes } from "./modules/folders/folder.routes.js";
import { fileRoutes } from "./modules/files/file.routes.js";
import { resumableRoutes } from "./modules/files/resumable.routes.js";
import { permissionRoutes } from "./modules/permissions/permission.routes.js";
import { trashRoutes } from "./modules/trash/trash.routes.js";
import { searchRoutes } from "./modules/search/search.routes.js";
import { syncRoutes } from "./modules/sync/sync.routes.js";

export async function buildServer(): Promise<FastifyInstance> {
    const app = fastify({
        bodyLimit: 100 * 1024 * 1024,
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

    await app.register(rateLimit, {
        max: env.NODE_ENV === "test" ? 1000 : 300,
        timeWindow: "1 minute",
    });

    await app.register(websocket);

    await app.register(jwt, {
        secret: env.JWT_SECRET,
    });
    app.addContentTypeParser(
        "application/octet-stream",
        { parseAs: "buffer", bodyLimit: 100 * 1024 * 1024 },
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
    await app.register(permissionRoutes, { prefix: "/api/v1/permissions" });
    await app.register(trashRoutes, { prefix: "/api/v1/trash" });
    await app.register(searchRoutes, { prefix: "/api/v1/search" });
    await app.register(syncRoutes, { prefix: "/api/v1/sync" });

    app.get("/health", async (_req: FastifyRequest, reply: FastifyReply) => {
        const [dbOk, minioOk] = await Promise.all([
            testDbConnection(),
            testMinioConnection(),
        ]);

        let redisOk = false;
        try {
            const pong = await redisClient.ping();
            redisOk = pong === "PONG";
        } catch {
            redisOk = false;
        }

        const isHealthy = dbOk && minioOk && redisOk;

        return reply.status(isHealthy ? 200 : 503).send({
            status: isHealthy ? "healthy" : "degraded",
            services: {
                database: dbOk ? "up" : "down",
                storage: minioOk ? "up" : "down",
                redis: redisOk ? "up" : "down",
            },
            system: {
                uptimeSeconds: Math.floor(process.uptime()),
                memoryUsageMb: {
                    rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
                    heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
                },
            },
            timestamp: new Date().toISOString(),
        });
    });

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const frontendDist = path.resolve(__dirname, '../frontend-dist');

    if (fs.existsSync(frontendDist)) {
        await app.register(fastifyStatic, {
            root: frontendDist,
            prefix: '/',
        });

        app.setNotFoundHandler((req, reply) => {
            if (!req.raw.url?.startsWith('/api/')) {
                reply.sendFile('index.html');
            } else {
                reply.status(404).send({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Route not found' },
                });
            }
        });
    }

    return app;
}
