import { query } from "../../db/client.js";
import { CreateFolderInput, UpdateFolderInput } from "./folder.schema.js";

export interface FolderRecord {
    id: string;
    owner_id: string;
    parent_id: string | null;
    name: string;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export class FolderService {
    static async create(
        userId: string,
        input: CreateFolderInput,
    ): Promise<FolderRecord> {
        const parentId = input.parentId || null;
        if (parentId) {
            const parent = await query(
                `SELECT id FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
                [parentId, userId],
            );
            if (parent.rows.length === 0) {
                const err: any = new Error("Parent folder not found");
                err.statusCode = 404;
                err.code = "PARENT_FOLDER_NOT_FOUND";
                throw err;
            }
        }
        try {
            const result = await query<FolderRecord>(
                `INSERT INTO folders (owner_id, parent_id, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
                [userId, parentId, input.name],
            );
            return result.rows[0];
        } catch (err: any) {
            if (err.code === "23505") {
                const conflictErr: any = new Error(
                    "A folder with this name already exists in this location",
                );
                conflictErr.statusCode = 409;
                conflictErr.code = "FOLDER_NAME_CONFLICT";
                throw conflictErr;
            }
            throw err;
        }
    }
    static async listContents(userId: string, folderId: string) {
        const isRoot = folderId === "root";
        const actualFolderId = isRoot ? null : folderId;
        if (!isRoot) {
            const folder = await query(
                `SELECT id, name FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
                [actualFolderId, userId],
            );
            if (folder.rows.length === 0) {
                const err: any = new Error("Folder not found");
                err.statusCode = 404;
                err.code = "FOLDER_NOT_FOUND";
                throw err;
            }
        }
        const foldersQuery = isRoot
            ? `SELECT id, name, parent_id, updated_at FROM folders WHERE owner_id = $1 AND parent_id IS NULL AND deleted_at IS NULL ORDER BY name ASC`
            : `SELECT id, name, parent_id, updated_at FROM folders WHERE owner_id = $1 AND parent_id = $2 AND deleted_at IS NULL ORDER BY name ASC`;
        const foldersParams = isRoot ? [userId] : [userId, actualFolderId];
        const folders = await query(foldersQuery, foldersParams);
        const filesQuery = isRoot
            ? `SELECT f.id, f.name, f.parent_id, f.updated_at, v.size_bytes, v.mime_type
         FROM files f
         LEFT JOIN file_versions v ON f.current_version_id = v.id
         WHERE f.owner_id = $1 AND f.parent_id IS NULL AND f.deleted_at IS NULL ORDER BY f.name ASC`
            : `SELECT f.id, f.name, f.parent_id, f.updated_at, v.size_bytes, v.mime_type
         FROM files f
         LEFT JOIN file_versions v ON f.current_version_id = v.id
         WHERE f.owner_id = $1 AND f.parent_id = $2 AND f.deleted_at IS NULL ORDER BY f.name ASC`;
        const files = await query(filesQuery, foldersParams);
        return {
            currentFolderId: actualFolderId,
            folders: folders.rows,
            files: files.rows,
        };
    }
    static async update(
        userId: string,
        folderId: string,
        input: UpdateFolderInput,
    ): Promise<FolderRecord> {
        const existing = await query<FolderRecord>(
            `SELECT * FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
            [folderId, userId],
        );
        if (existing.rows.length === 0) {
            const err: any = new Error("Folder not found");
            err.statusCode = 404;
            err.code = "FOLDER_NOT_FOUND";
            throw err;
        }
        if (input.parentId !== undefined) {
            const targetParentId = input.parentId;
            if (targetParentId === folderId) {
                const err: any = new Error("Cannot move a folder into itself");
                err.statusCode = 400;
                err.code = "CIRCULAR_FOLDER_MOVE";
                throw err;
            }
            if (targetParentId !== null) {
                const cycleCheck = await query(
                    `WITH RECURSIVE descendants AS (
             SELECT id, parent_id FROM folders WHERE id = $1 AND owner_id = $2
             UNION ALL
             SELECT f.id, f.parent_id FROM folders f
             INNER JOIN descendants d ON f.parent_id = d.id
             WHERE f.deleted_at IS NULL
           )
           SELECT id FROM descendants WHERE id = $3`,
                    [folderId, userId, targetParentId],
                );
                if (cycleCheck.rows.length > 0) {
                    const err: any = new Error(
                        "Cannot move folder into one of its own subfolders",
                    );
                    err.statusCode = 400;
                    err.code = "CIRCULAR_FOLDER_MOVE";
                    throw err;
                }
            }
        }
        const newName = input.name ?? existing.rows[0].name;
        const newParentId =
            input.parentId !== undefined
                ? input.parentId
                : existing.rows[0].parent_id;
        try {
            const result = await query<FolderRecord>(
                `UPDATE folders 
         SET name = $1, parent_id = $2, updated_at = NOW()
         WHERE id = $3 AND owner_id = $4
         RETURNING *`,
                [newName, newParentId, folderId, userId],
            );
            return result.rows[0];
        } catch (err: any) {
            if (err.code === "23505") {
                const conflictErr: any = new Error(
                    "A folder with this name already exists in this location",
                );
                conflictErr.statusCode = 409;
                conflictErr.code = "FOLDER_NAME_CONFLICT";
                throw conflictErr;
            }
            throw err;
        }
    }
    static async delete(userId: string, folderId: string): Promise<void> {
        const result = await query(
            `UPDATE folders SET deleted_at = NOW() WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
            [folderId, userId],
        );
        if (result.rowCount === 0) {
            const err: any = new Error("Folder not found");
            err.statusCode = 404;
            err.code = "FOLDER_NOT_FOUND";
            throw err;
        }
    }
}
