import { query, getClient } from "../../db/client.js";
import { minioClient } from "../../storage/minio.js";
import { env } from "../../config/env.js";

export interface OrphanCleanerResult {
    expiredSessionsCount: number;
    removedPartsCount: number;
}

export async function runOrphanCleaner(): Promise<OrphanCleanerResult> {
    const expiredSessionsRes = await query<{ id: string }>(
        `SELECT id FROM upload_sessions 
     WHERE status IN ('INITIATED', 'UPLOADING') 
       AND expires_at < NOW() 
     LIMIT 500`,
    );

    if (expiredSessionsRes.rows.length === 0) {
        return { expiredSessionsCount: 0, removedPartsCount: 0 };
    }

    let totalRemovedParts = 0;
    const client = await getClient();

    try {
        for (const session of expiredSessionsRes.rows) {
            const partsRes = await client.query<{ storage_key: string }>(
                `SELECT storage_key FROM upload_parts WHERE session_id = $1`,
                [session.id],
            );

            const partKeys = partsRes.rows.map((r) => r.storage_key);

            if (partKeys.length > 0) {
                try {
                    await minioClient.removeObjects(
                        env.MINIO_BUCKET_NAME,
                        partKeys,
                    );
                    totalRemovedParts += partKeys.length;
                } catch (err) {
                    console.error(
                        `Failed to remove MinIO objects for session ${session.id}:`,
                        err,
                    );
                }
            }

            await client.query("BEGIN");
            await client.query(
                `DELETE FROM upload_parts WHERE session_id = $1`,
                [session.id],
            );
            await client.query(
                `UPDATE upload_sessions SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
                [session.id],
            );
            await client.query("COMMIT");
        }
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }

    return {
        expiredSessionsCount: expiredSessionsRes.rows.length,
        removedPartsCount: totalRemovedParts,
    };
}
