import { query, getClient } from "../../db/client.js";
import { minioClient } from "../../storage/minio.js";
import { env } from "../../config/env.js";

export class TrashService {
    static async listTrash(userId: string) {
        const filesRes = await query(
            `SELECT f.id, f.name, f.parent_id, f.deleted_at, f.updated_at, 
              v.version_number, v.size_bytes, v.mime_type
       FROM files f
       LEFT JOIN file_versions v ON f.current_version_id = v.id
       WHERE f.owner_id = $1 AND f.deleted_at IS NOT NULL
       ORDER BY f.deleted_at DESC`,
            [userId],
        );

        const foldersRes = await query(
            `SELECT id, name, parent_id, deleted_at, updated_at
       FROM folders
       WHERE owner_id = $1 AND deleted_at IS NOT NULL
       ORDER BY deleted_at DESC`,
            [userId],
        );

        return {
            files: filesRes.rows,
            folders: foldersRes.rows,
        };
    }

    static async restore(
        userId: string,
        resourceType: "file" | "folder",
        id: string,
    ) {
        if (resourceType === "file") {
            const fileRes = await query(
                `SELECT id, parent_id FROM files WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL`,
                [id, userId],
            );

            if (fileRes.rows.length === 0) {
                const err: any = new Error("File not found in trash");
                err.statusCode = 404;
                err.code = "NOT_FOUND_IN_TRASH";
                throw err;
            }

            const file = fileRes.rows[0];
            let targetParentId = file.parent_id;

            if (targetParentId) {
                const parentRes = await query(
                    `SELECT id FROM folders WHERE id = $1 AND deleted_at IS NULL`,
                    [targetParentId],
                );
                if (parentRes.rows.length === 0) {
                    targetParentId = null;
                }
            }

            await query(
                `UPDATE files SET deleted_at = NULL, parent_id = $1, updated_at = NOW() WHERE id = $2`,
                [targetParentId, id],
            );

            return {
                success: true,
                restoredId: id,
                restoredToRoot: targetParentId === null,
            };
        } else {
            const folderRes = await query(
                `SELECT id, parent_id FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL`,
                [id, userId],
            );

            if (folderRes.rows.length === 0) {
                const err: any = new Error("Folder not found in trash");
                err.statusCode = 404;
                err.code = "NOT_FOUND_IN_TRASH";
                throw err;
            }

            const folder = folderRes.rows[0];
            let targetParentId = folder.parent_id;

            if (targetParentId) {
                const parentRes = await query(
                    `SELECT id FROM folders WHERE id = $1 AND deleted_at IS NULL`,
                    [targetParentId],
                );
                if (parentRes.rows.length === 0) {
                    targetParentId = null;
                }
            }

            await query(
                `UPDATE folders SET deleted_at = NULL, parent_id = $1, updated_at = NOW() WHERE id = $2`,
                [targetParentId, id],
            );

            return {
                success: true,
                restoredId: id,
                restoredToRoot: targetParentId === null,
            };
        }
    }

    static async permanentlyDelete(
        userId: string,
        resourceType: "file" | "folder",
        id: string,
    ) {
        const client = await getClient();
        try {
            if (resourceType === "file") {
                const fileRes = await client.query(
                    `SELECT id FROM files WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL`,
                    [id, userId],
                );

                if (fileRes.rows.length === 0) {
                    const err: any = new Error("File not found in trash");
                    err.statusCode = 404;
                    err.code = "NOT_FOUND_IN_TRASH";
                    throw err;
                }

                const versionsRes = await client.query<{ storage_key: string }>(
                    `SELECT storage_key FROM file_versions WHERE file_id = $1`,
                    [id],
                );

                const keys = versionsRes.rows.map((r) => r.storage_key);
                if (keys.length > 0) {
                    try {
                        await minioClient.removeObjects(
                            env.MINIO_BUCKET_NAME,
                            keys,
                        );
                    } catch (err) {
                        console.error(
                            "Failed to remove blobs from MinIO:",
                            err,
                        );
                    }
                }

                await client.query(`DELETE FROM files WHERE id = $1`, [id]);
                return { success: true, deletedId: id };
            } else {
                const folderRes = await client.query(
                    `SELECT id FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL`,
                    [id, userId],
                );

                if (folderRes.rows.length === 0) {
                    const err: any = new Error("Folder not found in trash");
                    err.statusCode = 404;
                    err.code = "NOT_FOUND_IN_TRASH";
                    throw err;
                }

                const treeFiles = await client.query<{ storage_key: string }>(
                    `WITH RECURSIVE folder_tree AS (
             SELECT id FROM folders WHERE id = $1
             UNION ALL
             SELECT f.id FROM folders f
             INNER JOIN folder_tree ft ON f.parent_id = ft.id
           )
           SELECT v.storage_key 
           FROM files fl
           INNER JOIN folder_tree ft ON fl.parent_id = ft.id
           INNER JOIN file_versions v ON fl.id = v.file_id`,
                    [id],
                );

                const keys = treeFiles.rows.map((r) => r.storage_key);
                if (keys.length > 0) {
                    try {
                        await minioClient.removeObjects(
                            env.MINIO_BUCKET_NAME,
                            keys,
                        );
                    } catch (err) {
                        console.error(
                            "Failed to remove folder blobs from MinIO:",
                            err,
                        );
                    }
                }

                await client.query(`DELETE FROM folders WHERE id = $1`, [id]);
                return { success: true, deletedId: id };
            }
        } finally {
            client.release();
        }
    }

    static async emptyTrash(userId: string) {
        const client = await getClient();
        try {
            const trashedFiles = await client.query<{ storage_key: string }>(
                `SELECT v.storage_key 
         FROM files f
         INNER JOIN file_versions v ON f.id = v.file_id
         WHERE f.owner_id = $1 AND f.deleted_at IS NOT NULL`,
                [userId],
            );

            const keys = trashedFiles.rows.map((r) => r.storage_key);
            if (keys.length > 0) {
                try {
                    await minioClient.removeObjects(
                        env.MINIO_BUCKET_NAME,
                        keys,
                    );
                } catch (err) {
                    console.error("Failed to remove trashed blobs:", err);
                }
            }

            await client.query("BEGIN");
            await client.query(
                `DELETE FROM files WHERE owner_id = $1 AND deleted_at IS NOT NULL`,
                [userId],
            );
            await client.query(
                `DELETE FROM folders WHERE owner_id = $1 AND deleted_at IS NOT NULL`,
                [userId],
            );
            await client.query("COMMIT");

            return { success: true };
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }
}
