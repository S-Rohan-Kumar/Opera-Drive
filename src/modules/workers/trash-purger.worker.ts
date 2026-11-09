import { query, getClient } from "../../db/client.js";
import { minioClient } from "../../storage/minio.js";
import { env } from "../../config/env.js";

export interface TrashPurgerResult {
    purgedFilesCount: number;
    purgedFoldersCount: number;
    removedBlobsCount: number;
}

export async function runTrashPurger(
    retentionDays: number = 30,
): Promise<TrashPurgerResult> {
    const expiredFilesRes = await query<{ id: string }>(
        `SELECT id FROM files 
     WHERE deleted_at IS NOT NULL 
       AND deleted_at < NOW() - ($1 || ' days')::interval 
     LIMIT 500`,
        [retentionDays],
    );

    let removedBlobsCount = 0;
    const client = await getClient();

    try {
        for (const file of expiredFilesRes.rows) {
            const versionsRes = await client.query<{ storage_key: string }>(
                `SELECT storage_key FROM file_versions WHERE file_id = $1`,
                [file.id],
            );

            const blobKeys = versionsRes.rows.map((r) => r.storage_key);

            if (blobKeys.length > 0) {
                try {
                    await minioClient.removeObjects(
                        env.MINIO_BUCKET_NAME,
                        blobKeys,
                    );
                    removedBlobsCount += blobKeys.length;
                } catch (err) {
                    console.error(
                        `Failed to remove MinIO blobs for purged file ${file.id}:`,
                        err,
                    );
                }
            }

            await client.query("DELETE FROM files WHERE id = $1", [file.id]);
        }

        const expiredFoldersRes = await client.query<{ id: string }>(
            `SELECT id FROM folders 
       WHERE deleted_at IS NOT NULL 
         AND deleted_at < NOW() - ($1 || ' days')::interval 
       LIMIT 500`,
            [retentionDays],
        );

        for (const folder of expiredFoldersRes.rows) {
            await client.query("DELETE FROM folders WHERE id = $1", [
                folder.id,
            ]);
        }

        return {
            purgedFilesCount: expiredFilesRes.rows.length,
            purgedFoldersCount: expiredFoldersRes.rows.length,
            removedBlobsCount,
        };
    } finally {
        client.release();
    }
}
