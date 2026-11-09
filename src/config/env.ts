import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
    PORT: z.coerce.number().default(4000),
    HOST: z.string().default("0.0.0.0"),
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    MINIO_ENDPOINT: z.string().default("localhost"),
    MINIO_PORT: z.coerce.number().default(9000),
    MINIO_USE_SSL: z
        .string()
        .transform((val) => val === "true")
        .default("false"),
    MINIO_ACCESS_KEY: z.string().min(1, "MINIO_ACCESS_KEY is required"),
    MINIO_SECRET_KEY: z.string().min(1, "MINIO_SECRET_KEY is required"),
    MINIO_BUCKET_NAME: z.string().default("opera-drive-blobs"),

    JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 chars"),
    JWT_EXPIRES_IN: z.string().default("7d"),

    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error(
        "❌ Invalid environment configuration:",
        parsed.error.format(),
    );
    process.exit(1);
}

export const env = parsed.data;
