import { query } from "../../db/client.js";
import { ShareResourceInput } from "./permission.schema.js";

export class PermissionService {
    static async share(ownerId: string, input: ShareResourceInput) {
        const table = input.resourceType === "file" ? "files" : "folders";
        const resourceRes = await query(
            `SELECT id, owner_id FROM ${table} WHERE id = $1 AND deleted_at IS NULL`,
            [input.resourceId],
        );
        if (resourceRes.rows.length === 0) {
            const err: any = new Error(`${input.resourceType} not found`);
            err.statusCode = 404;
            err.code = "RESOURCE_NOsT_FOUND";
            throw err;
        }
        if (resourceRes.rows[0].owner_id !== ownerId) {
            const err: any = new Error(
                "Only the owner can share this resource",
            );
            err.statusCode = 403;
            err.code = "FORBIDDEN";
            throw err;
        }
        const userRes = await query(
            `SELECT id, email, full_name FROM users WHERE email = $1`,
            [input.email.toLowerCase()],
        );
        if (userRes.rows.length === 0) {
            const err: any = new Error("User with this email not found");
            err.statusCode = 404;
            err.code = "USER_NOT_FOUND";
            throw err;
        }
        const targetUser = userRes.rows[0];
        if (targetUser.id === ownerId) {
            const err: any = new Error("Cannot share a resource with yourself");
            err.statusCode = 400;
            err.code = "CANNOT_SHARE_WITH_SELF";
            throw err;
        }
        const permRes = await query(
            `INSERT INTO permissions (resource_type, resource_id, user_id, role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (resource_type, resource_id, user_id)
             DO UPDATE SET role = EXCLUDED.role
             RETURNING id, resource_type, resource_id, role, created_at`,
            [input.resourceType, input.resourceId, targetUser.id, input.role],
        );
        return {
            ...permRes.rows[0],
            user: targetUser,
        };
    }
    static async listResourcePermissions(
        userId: string,
        resourceType: "file" | "folder",
        resourceId: string,
    ) {
        const table = resourceType === "file" ? "files" : "folders";
        const resourceRes = await query(
            `SELECT id, owner_id FROM ${table} WHERE id = $1 AND deleted_at IS NULL`,
            [resourceId],
        );
        if (resourceRes.rows.length === 0) {
            const err: any = new Error(`${resourceType} not found`);
            err.statusCode = 404;
            err.code = "RESOURCE_NOT_FOUND";
            throw err;
        }
        if (resourceRes.rows[0].owner_id !== userId) {
            const permCheck = await query(
                `SELECT 1 FROM permissions WHERE resource_type = $1 AND resource_id = $2 AND user_id = $3`,
                [resourceType, resourceId, userId],
            );
            if (permCheck.rows.length === 0) {
                const err: any = new Error("Access denied");
                err.statusCode = 403;
                err.code = "FORBIDDEN";
                throw err;
            }
        }
        const permsRes = await query(
            `SELECT p.id, p.role, p.created_at, u.id AS user_id, u.email, u.full_name
             FROM permissions p
             JOIN users u ON p.user_id = u.id
             WHERE p.resource_type = $1 AND p.resource_id = $2
             ORDER BY p.created_at DESC`,
            [resourceType, resourceId],
        );
        return permsRes.rows;
    }
    static async revoke(ownerId: string, permissionId: string) {
        const permRes = await query(
            `SELECT p.id, p.resource_type, p.resource_id 
             FROM permissions p
             WHERE p.id = $1`,
            [permissionId],
        );
        if (permRes.rows.length === 0) {
            const err: any = new Error("Permission not found");
            err.statusCode = 404;
            err.code = "PERMISSION_NOT_FOUND";
            throw err;
        }
        const perm = permRes.rows[0];
        const table = perm.resource_type === "file" ? "files" : "folders";
        const resourceRes = await query(
            `SELECT owner_id FROM ${table} WHERE id = $1`,
            [perm.resource_id],
        );
        if (
            resourceRes.rows.length === 0 ||
            resourceRes.rows[0].owner_id !== ownerId
        ) {
            const err: any = new Error("Only the owner can revoke permissions");
            err.statusCode = 403;
            err.code = "FORBIDDEN";
            throw err;
        }
        await query(`DELETE FROM permissions WHERE id = $1`, [permissionId]);
        return { success: true };
    }
    static async getSharedWithMe(userId: string) {
        const sharedFiles = await query(
            `SELECT f.id, f.name, f.parent_id, f.owner_id, f.updated_at, p.role,
                    fv.size_bytes, fv.mime_type, u.full_name AS owner_name, u.email AS owner_email
             FROM permissions p
             JOIN files f ON p.resource_id = f.id AND p.resource_type = 'file'
             LEFT JOIN file_versions fv ON f.current_version_id = fv.id
             JOIN users u ON f.owner_id = u.id
             WHERE p.user_id = $1 AND f.deleted_at IS NULL
             ORDER BY p.created_at DESC`,
            [userId],
        );
        const sharedFolders = await query(
            `SELECT fd.id, fd.name, fd.parent_id, fd.owner_id, fd.updated_at, p.role,
                    u.full_name AS owner_name, u.email AS owner_email
             FROM permissions p
             JOIN folders fd ON p.resource_id = fd.id AND p.resource_type = 'folder'
             JOIN users u ON fd.owner_id = u.id
             WHERE p.user_id = $1 AND fd.deleted_at IS NULL
             ORDER BY p.created_at DESC`,
            [userId],
        );
        return {
            files: sharedFiles.rows,
            folders: sharedFolders.rows,
        };
    }
    static async checkFileAccess(
        userId: string,
        fileId: string,
    ): Promise<{ role: "owner" | "editor" | "viewer" }> {
        const fileRes = await query(
            `SELECT id, owner_id, parent_id FROM files WHERE id = $1 AND deleted_at IS NULL`,
            [fileId],
        );
        if (fileRes.rows.length === 0) {
            const err: any = new Error("File not found");
            err.statusCode = 404;
            err.code = "FILE_NOT_FOUND";
            throw err;
        }
        const file = fileRes.rows[0];
        if (file.owner_id === userId) {
            return { role: "owner" };
        }
        const permRes = await query(
            `SELECT role FROM permissions WHERE resource_type = 'file' AND resource_id = $1 AND user_id = $2`,
            [fileId, userId],
        );
        if (permRes.rows.length > 0) {
            return { role: permRes.rows[0].role };
        }
        if (file.parent_id) {
            const folderPerm = await query(
                `SELECT role FROM permissions WHERE resource_type = 'folder' AND resource_id = $1 AND user_id = $2`,
                [file.parent_id, userId],
            );
            if (folderPerm.rows.length > 0) {
                return { role: folderPerm.rows[0].role };
            }
        }
        const err: any = new Error("Access denied");
        err.statusCode = 403;
        err.code = "FORBIDDEN";
        throw err;
    }
}
