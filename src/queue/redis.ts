import { Redis } from "ioredis";
import { env } from "../config/env.js";

export const redisOptions = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
};

export const redisConnectionOptions = redisOptions;

export const redisClient = new Redis(redisOptions);

redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});
