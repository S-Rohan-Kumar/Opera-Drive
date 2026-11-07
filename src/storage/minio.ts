import * as Minio from "minio";
import { Readable } from "stream";
import { env } from "../config/env.js";

export const minioClient = new Minio.Client({
    endPoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    useSSL: env.MINIO_USE_SSL,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
});

export async function ensureBucketExists(
    bucketName: string = env.MINIO_BUCKET_NAME,
): Promise<void> {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
        await minioClient.makeBucket(bucketName, "us-east-1");
        console.log(`🪣 Created MinIO bucket: ${bucketName}`);
    } else {
        console.log(`🪣 MinIO bucket '${bucketName}' ready.`);
    }
}

export async function uploadStream(
    bucket: string,
    key: string,
    stream: Readable | Buffer,
    size?: number,
    mimeType: string = "application/octet-stream",
): Promise<Awaited<ReturnType<Minio.Client["putObject"]>>> {
    const actualSize = Buffer.isBuffer(stream) ? stream.length : size;
    return await minioClient.putObject(bucket, key, stream, actualSize, {
        "Content-Type": mimeType,
    });
}

export async function downloadStream(
    bucket: string,
    key: string,
): Promise<Readable> {
    return await minioClient.getObject(bucket, key);
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
    await minioClient.removeObject(bucket, key);
}

export async function testMinioConnection(): Promise<boolean> {
    try {
        await minioClient.listBuckets();
        return true;
    } catch (err) {
        console.error("Failed to connect to MinIO:", err);
        return false;
    }
}
