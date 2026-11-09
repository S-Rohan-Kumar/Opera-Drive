import { Redis } from "ioredis";
import type { ConnectionOptions } from "bullmq";
import { env } from "../config/env.js";

export const redisConnectionOptions: ConnectionOptions = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
};

export const redisClient = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
});

redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});
