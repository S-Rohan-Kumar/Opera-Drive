import crypto, { randomUUID } from "crypto";
import { Readable } from "stream";
import { query, getClient } from "../../db/client.js";
import {
    uploadStream,
    downloadStream,
    deleteObject,
} from "../../storage/minio.js";
import { env } from "../../config/env.js";
import { PermissionService } from "../permissions/permission.service.js";

export interface FileRecord {
    id: string;
    owner_id: string;
    parent_id: string | null;
    current_version_id: string | null;
    name: string;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export class FileService {
    static async uploadSinglePart(
        userId: string,
        fileStreamOrBuffer: Readable | Buffer,
        filename: string,
        mimeType: string,
        parentId?: string | null,
    ) {
        const targetParentId = parentId || null;
        let containerOwnerId = userId;
        if (targetParentId) {
            const parentRes = await query(
                `SELECT id, owner_id FROM folders WHERE id = $1 AND deleted_at IS NULL`,
                [targetParentId],
            );
            if (parentRes.rows.length === 0) {
                const err: any = new Error("Parent folder not found");
                err.statusCode = 404;
                err.code = "PARENT_FOLDER_NOT_FOUND";
                throw err;
            }
            containerOwnerId = parentRes.rows[0].owner_id;
            if (containerOwnerId !== userId) {
                const permRes = await query(
                    `SELECT role FROM permissions WHERE resource_type = 'folder' AND resource_id = $1 AND user_id = $2`,
                    [targetParentId, userId],
                );
                if (permRes.rows.length === 0 || permRes.rows[0].role !== "editor") {
                    const err: any = new Error("You do not have permission to upload to this folder");
                    err.statusCode = 403;
                    err.code = "FORBIDDEN";
                    throw err;
                }
            }
        }

        let buffer: Buffer;
        if (Buffer.isBuffer(fileStreamOrBuffer)) {
            buffer = fileStreamOrBuffer;
        } else {
            const chunks: Buffer[] = [];
            for await (const chunk of fileStreamOrBuffer) {
                chunks.push(
                    Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
                );
            }
            buffer = Buffer.concat(chunks);
        }

        const sizeBytes = buffer.length;
        const sha256Checksum = crypto
            .createHash("sha256")
            .update(buffer)
            .digest("hex");
        const storageKey = `objects/${randomUUID()}`;

        try {
            await uploadStream(
                env.MINIO_BUCKET_NAME,
                storageKey,
                buffer,
                sizeBytes,
                mimeType,
            );
        } catch (uploadErr) {
            throw new Error(
                `Failed to upload file to storage: ${(uploadErr as Error).message}`,
            );
        }

        const client = await getClient();
        try {
            await client.query("BEGIN");
            const fileResult = await client.query<FileRecord>(
                `INSERT INTO files (owner_id, parent_id, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
                [containerOwnerId, targetParentId, filename],
            );
            const file = fileResult.rows[0];

            const versionResult = await client.query(
                `INSERT INTO file_versions (file_id, version_number, storage_key, size_bytes, mime_type, checksum_sha256, uploaded_by)
         VALUES ($1, 1, $2, $3, $4, $5, $6)
         RETURNING *`,
                [
                    file.id,
                    storageKey,
                    sizeBytes,
                    mimeType,
                    sha256Checksum,
                    userId,
                ],
            );
            const version = versionResult.rows[0];

            await client.query(
                `UPDATE files SET current_version_id = $1 WHERE id = $2`,
                [version.id, file.id],
            );

            await client.query("COMMIT");

            return {
                file: { ...file, current_version_id: version.id },
                version,
            };
        } catch (dbErr: any) {
            await client.query("ROLLBACK");
            try {
                await deleteObject(env.MINIO_BUCKET_NAME, storageKey);
            } catch (cleanupErr) {
                console.error(
                    "Failed to clean up orphaned MinIO object:",
                    storageKey,
                    cleanupErr,
                );
            }
            if (dbErr.code === "23505") {
                const conflictErr: any = new Error(
                    "A file with this name already exists in this folder",
                );
                conflictErr.statusCode = 409;
                conflictErr.code = "FILE_NAME_CONFLICT";
                throw conflictErr;
            }
            throw dbErr;
        } finally {
            client.release();
        }
    }

    static async getFile(userId: string, fileId: string) {
        await PermissionService.checkFileAccess(userId, fileId);
        const result = await query(
            `SELECT f.*, v.storage_key, v.size_bytes, v.mime_type, v.checksum_sha256, v.version_number
       FROM files f
       INNER JOIN file_versions v ON f.current_version_id = v.id
       WHERE f.id = $1 AND f.deleted_at IS NULL`,
            [fileId],
        );
        if (result.rows.length === 0) {
            const err: any = new Error("File not found");
            err.statusCode = 404;
            err.code = "FILE_NOT_FOUND";
            throw err;
        }
        return result.rows[0];
    }

    static async getDownloadStream(userId: string, fileId: string) {
        const file = await this.getFile(userId, fileId);
        const stream = await downloadStream(
            env.MINIO_BUCKET_NAME,
            file.storage_key,
        );
        return {
            stream,
            filename: file.name,
            mimeType: file.mime_type,
            sizeBytes: file.size_bytes,
        };
    }

    static async delete(userId: string, fileId: string): Promise<void> {
        const result = await query(
            `UPDATE files SET deleted_at = NOW() WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
            [fileId, userId],
        );
        if (result.rowCount === 0) {
            const err: any = new Error("File not found");
            err.statusCode = 404;
            err.code = "FILE_NOT_FOUND";
            throw err;
        }
    }
    static async listVersions(userId: string, fileId: string) {
        await PermissionService.checkFileAccess(userId, fileId);
        const fileRes = await query(
            `SELECT id, current_version_id, name FROM files WHERE id = $1 AND deleted_at IS NULL`,
            [fileId],
        );
        if (fileRes.rows.length === 0) {
            const err: any = new Error("File not found");
            err.statusCode = 404;
            err.code = "FILE_NOT_FOUND";
            throw err;
        }

        const versionsRes = await query(
            `SELECT id, version_number, size_bytes, mime_type, checksum_sha256, created_at,
                    (id = $2) AS is_current
             FROM file_versions 
             WHERE file_id = $1 
             ORDER BY version_number DESC`,
            [fileId, fileRes.rows[0].current_version_id],
        );

        return {
            file: fileRes.rows[0],
            versions: versionsRes.rows,
        };
    }

    static async getVersionDownloadStream(
        userId: string,
        fileId: string,
        versionId: string,
    ) {
        await PermissionService.checkFileAccess(userId, fileId);
        const fileRes = await query(
            `SELECT id, name FROM files WHERE id = $1 AND deleted_at IS NULL`,
            [fileId],
        );
        if (fileRes.rows.length === 0) {
            const err: any = new Error("File not found");
            err.statusCode = 404;
            err.code = "FILE_NOT_FOUND";
            throw err;
        }

        const vRes = await query(
            `SELECT storage_key, mime_type, size_bytes FROM file_versions WHERE id = $1 AND file_id = $2`,
            [versionId, fileId],
        );
        if (vRes.rows.length === 0) {
            const err: any = new Error("Version not found");
            err.statusCode = 404;
            err.code = "VERSION_NOT_FOUND";
            throw err;
        }

        const version = vRes.rows[0];
        const stream = await downloadStream(
            env.MINIO_BUCKET_NAME,
            version.storage_key,
        );

        return {
            stream,
            filename: fileRes.rows[0].name,
            mimeType: version.mime_type,
            sizeBytes: version.size_bytes,
        };
    }

    static async rollbackVersion(
        userId: string,
        fileId: string,
        versionId: string,
    ) {
        const access = await PermissionService.checkFileAccess(userId, fileId);
        if (access.role === "viewer") {
            const err: any = new Error("Viewers cannot rollback file versions");
            err.statusCode = 403;
            err.code = "FORBIDDEN";
            throw err;
        }
        const fileRes = await query(
            `SELECT id, current_version_id FROM files WHERE id = $1 AND deleted_at IS NULL`,
            [fileId],
        );
        if (fileRes.rows.length === 0) {
            const err: any = new Error("File not found");
            err.statusCode = 404;
            err.code = "FILE_NOT_FOUND";
            throw err;
        }

        const vRes = await query(
            `SELECT id, version_number, size_bytes, checksum_sha256 FROM file_versions WHERE id = $1 AND file_id = $2`,
            [versionId, fileId],
        );
        if (vRes.rows.length === 0) {
            const err: any = new Error("Version not found for this file");
            err.statusCode = 404;
            err.code = "VERSION_NOT_FOUND";
            throw err;
        }

        await query(
            `UPDATE files SET current_version_id = $1, updated_at = NOW() WHERE id = $2`,
            [versionId, fileId],
        );

        return {
            fileId,
            currentVersionId: versionId,
            versionNumber: vRes.rows[0].version_number,
        };
    }
}
