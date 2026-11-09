import crypto, { randomUUID } from "crypto";
import { Readable } from "stream";
import { query, getClient } from "../../db/client.js";
import {
    uploadStream,
    downloadStream,
    deleteObject,
    minioClient,
} from "../../storage/minio.js";
import { env } from "../../config/env.js";
import { PermissionService } from "../permissions/permission.service.js";
import { EventBus } from "../sync/event-bus.js";

export interface InitiateSessionInput {
    fileName: string;
    mimeType: string;
    expectedSizeBytes: number;
    expectedSha256: string;
    parentId?: string | null;
    fileId?: string | null;
}

export class ResumableService {
    static async initiate(userId: string, input: InitiateSessionInput) {
        let targetParentId = input.parentId || null;
        let targetFileId = input.fileId || null;

        if (targetFileId) {
            const fileCheck = await PermissionService.checkFileAccess(
                userId,
                targetFileId,
            );
            if (fileCheck.role !== "owner" && fileCheck.role !== "editor") {
                const err: any = new Error(
                    "You do not have permission to update this file",
                );
                err.statusCode = 403;
                err.code = "FORBIDDEN";
                throw err;
            }
            const fileRow = await query(
                `SELECT parent_id FROM files WHERE id = $1`,
                [targetFileId],
            );
            if (fileRow.rows.length > 0) {
                targetParentId = fileRow.rows[0].parent_id;
            }
        } else if (targetParentId) {
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
            const parentFolder = parentRes.rows[0];
            if (parentFolder.owner_id !== userId) {
                const permRes = await query(
                    `SELECT role FROM permissions WHERE resource_type = 'folder' AND resource_id = $1 AND user_id = $2`,
                    [targetParentId, userId],
                );
                if (
                    permRes.rows.length === 0 ||
                    permRes.rows[0].role !== "editor"
                ) {
                    const err: any = new Error(
                        "You do not have permission to upload to this folder",
                    );
                    err.statusCode = 403;
                    err.code = "FORBIDDEN";
                    throw err;
                }
            }
        }
        const result = await query(
            `INSERT INTO upload_sessions 
             (user_id, file_id, parent_id, file_name, mime_type, expected_size_bytes, expected_sha256, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'INITIATED')
             RETURNING id, file_id, file_name, mime_type, expected_size_bytes, expected_sha256, status, expires_at, created_at`,
            [
                userId,
                targetFileId,
                targetParentId,
                input.fileName,
                input.mimeType,
                input.expectedSizeBytes,
                input.expectedSha256.toLowerCase(),
            ],
        );
        return result.rows[0];
    }

    static async uploadPart(
        userId: string,
        sessionId: string,
        partNumber: number,
        chunkBuffer: Buffer,
    ) {
        if (partNumber < 1) {
            const err: any = new Error("Part number must be >= 1");
            err.statusCode = 400;
            err.code = "INVALID_PART_NUMBER";
            throw err;
        }
        const sessionRes = await query(
            `SELECT * FROM upload_sessions WHERE id = $1 AND user_id = $2`,
            [sessionId, userId],
        );
        if (sessionRes.rows.length === 0) {
            const err: any = new Error("Upload session not found");
            err.statusCode = 404;
            err.code = "SESSION_NOT_FOUND";
            throw err;
        }
        const session = sessionRes.rows[0];
        if (session.status !== "INITIATED" && session.status !== "UPLOADING") {
            const err: any = new Error(
                `Session is already ${session.status.toLowerCase()}`,
            );
            err.statusCode = 400;
            err.code = "INVALID_SESSION_STATUS";
            throw err;
        }
        if (new Date(session.expires_at).getTime() < Date.now()) {
            await query(
                `UPDATE upload_sessions SET status = 'EXPIRED' WHERE id = $1`,
                [sessionId],
            );
            const err: any = new Error("Upload session has expired");
            err.statusCode = 410;
            err.code = "SESSION_EXPIRED";
            throw err;
        }
        const partStorageKey = `chunks/${sessionId}/part_${partNumber}`;
        const partSize = chunkBuffer.length;
        const etag = crypto.createHash("md5").update(chunkBuffer).digest("hex");
        await uploadStream(
            env.MINIO_BUCKET_NAME,
            partStorageKey,
            chunkBuffer,
            partSize,
        );
        await query(
            `INSERT INTO upload_parts (session_id, part_number, storage_key, size_bytes, etag)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (session_id, part_number)
             DO UPDATE SET storage_key = EXCLUDED.storage_key, size_bytes = EXCLUDED.size_bytes, etag = EXCLUDED.etag`,
            [sessionId, partNumber, partStorageKey, partSize, etag],
        );
        await query(
            `UPDATE upload_sessions SET status = 'UPLOADING', updated_at = NOW() WHERE id = $1`,
            [sessionId],
        );
        return {
            sessionId,
            partNumber,
            sizeBytes: partSize,
            etag,
        };
    }
    static async getSessionStatus(userId: string, sessionId: string) {
        const sessionRes = await query(
            `SELECT * FROM upload_sessions WHERE id = $1 AND user_id = $2`,
            [sessionId, userId],
        );
        if (sessionRes.rows.length === 0) {
            const err: any = new Error("Upload session not found");
            err.statusCode = 404;
            err.code = "SESSION_NOT_FOUND";
            throw err;
        }
        const partsRes = await query(
            `SELECT part_number, size_bytes, etag, created_at 
             FROM upload_parts 
             WHERE session_id = $1 
             ORDER BY part_number ASC`,
            [sessionId],
        );
        const totalUploadedBytes = partsRes.rows.reduce(
            (sum: number, p: any) => sum + Number(p.size_bytes),
            0,
        );
        return {
            session: sessionRes.rows[0],
            parts: partsRes.rows,
            totalUploadedBytes,
        };
    }
    static async finalizeSession(userId: string, sessionId: string) {
        const sessionRes = await query(
            `SELECT * FROM upload_sessions WHERE id = $1 AND user_id = $2`,
            [sessionId, userId],
        );
        if (sessionRes.rows.length === 0) {
            const err: any = new Error("Upload session not found");
            err.statusCode = 404;
            err.code = "SESSION_NOT_FOUND";
            throw err;
        }
        const session = sessionRes.rows[0];
        if (session.status !== "INITIATED" && session.status !== "UPLOADING") {
            const err: any = new Error(
                `Session is already ${session.status.toLowerCase()}`,
            );
            err.statusCode = 400;
            err.code = "INVALID_SESSION_STATUS";
            throw err;
        }
        const partsRes = await query(
            `SELECT part_number, storage_key, size_bytes 
             FROM upload_parts 
             WHERE session_id = $1 
             ORDER BY part_number ASC`,
            [sessionId],
        );
        const parts = partsRes.rows;
        if (parts.length === 0) {
            const err: any = new Error("No parts uploaded for this session");
            err.statusCode = 400;
            err.code = "NO_PARTS_UPLOADED";
            throw err;
        }
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].part_number !== i + 1) {
                const err: any = new Error(`Missing part number ${i + 1}`);
                err.statusCode = 400;
                err.code = "MISSING_PARTS";
                throw err;
            }
        }
        const totalUploadedBytes = parts.reduce(
            (sum: number, p: any) => sum + Number(p.size_bytes),
            0,
        );
        if (totalUploadedBytes !== Number(session.expected_size_bytes)) {
            const err: any = new Error(
                `Total uploaded size (${totalUploadedBytes}) does not match expected size (${session.expected_size_bytes})`,
            );
            err.statusCode = 400;
            err.code = "SIZE_MISMATCH";
            throw err;
        }
        const chunks: Buffer[] = [];
        const hash = crypto.createHash("sha256");
        for (const part of parts) {
            const stream = await downloadStream(
                env.MINIO_BUCKET_NAME,
                part.storage_key,
            );
            for await (const chunk of stream) {
                const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                hash.update(buf);
                chunks.push(buf);
            }
        }
        const actualSha256 = hash.digest("hex");
        if (
            actualSha256.toLowerCase() !== session.expected_sha256.toLowerCase()
        ) {
            const err: any = new Error(
                `Checksum mismatch: expected ${session.expected_sha256}, got ${actualSha256}`,
            );
            err.statusCode = 400;
            err.code = "CHECKSUM_MISMATCH";
            throw err;
        }
        const combinedBuffer = Buffer.concat(chunks);
        const finalStorageKey = `objects/${randomUUID()}`;
        await uploadStream(
            env.MINIO_BUCKET_NAME,
            finalStorageKey,
            combinedBuffer,
            combinedBuffer.length,
            session.mime_type,
        );
        const client = await getClient();
        try {
            await client.query("BEGIN");
            let targetOwnerId = userId;
            let fileId: string;
            let versionNumber = 1;

            if (session.file_id) {
                fileId = session.file_id;
                const fileOwnerRes = await client.query(
                    `SELECT owner_id FROM files WHERE id = $1`,
                    [fileId],
                );
                if (fileOwnerRes.rows.length > 0) {
                    targetOwnerId = fileOwnerRes.rows[0].owner_id;
                }
                const vRes = await client.query(
                    `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_v FROM file_versions WHERE file_id = $1`,
                    [fileId],
                );
                versionNumber = vRes.rows[0].next_v;
            } else {
                if (session.parent_id) {
                    const folderRes = await client.query(
                        `SELECT owner_id FROM folders WHERE id = $1`,
                        [session.parent_id],
                    );
                    if (folderRes.rows.length > 0) {
                        targetOwnerId = folderRes.rows[0].owner_id;
                    }
                }

                const existingFileRes = await client.query(
                    `SELECT id FROM files 
                     WHERE owner_id = $1 
                       AND parent_id IS NOT DISTINCT FROM $2::uuid
                       AND name = $3 
                       AND deleted_at IS NULL`,
                    [targetOwnerId, session.parent_id, session.file_name],
                );
                if (existingFileRes.rows.length > 0) {
                    fileId = existingFileRes.rows[0].id;
                    const vRes = await client.query(
                        `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_v FROM file_versions WHERE file_id = $1`,
                        [fileId],
                    );
                    versionNumber = vRes.rows[0].next_v;
                } else {
                    const fileInsert = await client.query(
                        `INSERT INTO files (owner_id, parent_id, name)
                         VALUES ($1, $2, $3)
                         RETURNING id`,
                        [targetOwnerId, session.parent_id, session.file_name],
                    );
                    fileId = fileInsert.rows[0].id;
                }
            }
            const versionInsert = await client.query(
                `INSERT INTO file_versions 
                 (file_id, version_number, storage_key, size_bytes, mime_type, checksum_sha256, uploaded_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [
                    fileId,
                    versionNumber,
                    finalStorageKey,
                    combinedBuffer.length,
                    session.mime_type,
                    actualSha256,
                    userId,
                ],
            );
            const versionId = versionInsert.rows[0].id;
            await client.query(
                `UPDATE files SET current_version_id = $1, updated_at = NOW() WHERE id = $2`,
                [versionId, fileId],
            );
            await client.query(
                `UPDATE upload_sessions SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
                [sessionId],
            );
            await client.query("COMMIT");
            const eventType =
                versionNumber > 1 ? "VERSION_UPLOADED" : "FILE_CREATED";
            const eventPayload = {
                type: eventType as any,
                resourceType: "file" as const,
                resourceId: fileId,
                resourceName: session.file_name,
                parentId: session.parent_id,
                actorId: userId,
                timestamp: new Date().toISOString(),
                data: { versionNumber },
            };

            await EventBus.publish(targetOwnerId, eventPayload);

            const collaborators = await query<{ user_id: string }>(
                `SELECT user_id FROM permissions WHERE (resource_type = 'file' AND resource_id = $1)
                 OR (resource_type = 'folder' AND resource_id = $2)`,
                [fileId, session.parent_id],
            );
            for (const col of collaborators.rows) {
                if (col.user_id !== targetOwnerId) {
                    await EventBus.publish(col.user_id, eventPayload);
                }
            }
            const partKeys = parts.map((p: any) => p.storage_key);
            try {
                await minioClient.removeObjects(
                    env.MINIO_BUCKET_NAME,
                    partKeys,
                );
            } catch (cleanupErr) {
                console.warn(
                    "Failed to clean up chunk objects from MinIO:",
                    cleanupErr,
                );
            }
            return {
                fileId,
                versionId,
                versionNumber,
                name: session.file_name,
                sizeBytes: combinedBuffer.length,
                checksumSha256: actualSha256,
            };
        } catch (dbErr: any) {
            await client.query("ROLLBACK");
            await deleteObject(env.MINIO_BUCKET_NAME, finalStorageKey).catch(
                () => {},
            );
            throw dbErr;
        } finally {
            client.release();
        }
    }
    static async abortSession(userId: string, sessionId: string) {
        const sessionRes = await query(
            `SELECT * FROM upload_sessions WHERE id = $1 AND user_id = $2`,
            [sessionId, userId],
        );
        if (sessionRes.rows.length === 0) {
            const err: any = new Error("Upload session not found");
            err.statusCode = 404;
            err.code = "SESSION_NOT_FOUND";
            throw err;
        }
        const session = sessionRes.rows[0];
        if (session.status === "COMPLETED") {
            const err: any = new Error(
                "Cannot abort a completed upload session",
            );
            err.statusCode = 400;
            err.code = "SESSION_ALREADY_COMPLETED";
            throw err;
        }
        const partsRes = await query(
            `SELECT storage_key FROM upload_parts WHERE session_id = $1`,
            [sessionId],
        );
        const partKeys = partsRes.rows.map((p: any) => p.storage_key);
        if (partKeys.length > 0) {
            try {
                await minioClient.removeObjects(
                    env.MINIO_BUCKET_NAME,
                    partKeys,
                );
            } catch (err) {
                console.warn("Failed to remove aborted part objects:", err);
            }
        }
        await query(
            `UPDATE upload_sessions SET status = 'ABORTED', updated_at = NOW() WHERE id = $1`,
            [sessionId],
        );
        return { success: true, message: "Upload session aborted" };
    }
}
