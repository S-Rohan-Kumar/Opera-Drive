import { query } from "../../db/client.js";
import { SearchQueryInput } from "./search.schema.js";

export class SearchService {
    static async search(userId: string, input: SearchQueryInput) {
        const searchTerm = input.q.trim();
        const searchPattern = `%${searchTerm}%`;
        const limit = input.limit;

        let matchedFolders: any[] = [];
        let matchedFiles: any[] = [];

        if (input.type === "all" || input.type === "folders") {
            const foldersRes = await query(
                `SELECT fd.id, fd.name, fd.parent_id, fd.updated_at,
                u.full_name AS owner_name,
                similarity(fd.name, $1) AS rank
         FROM folders fd
         JOIN users u ON fd.owner_id = u.id
         WHERE fd.deleted_at IS NULL
           AND (
             fd.owner_id = $2
             OR fd.id IN (
               SELECT resource_id FROM permissions 
               WHERE resource_type = 'folder' AND user_id = $2
             )
           )
           AND (fd.name ILIKE $3 OR similarity(fd.name, $1) > 0.2)
         ORDER BY rank DESC, fd.name ASC
         LIMIT $4`,
                [searchTerm, userId, searchPattern, limit],
            );
            matchedFolders = foldersRes.rows;
        }

        if (input.type !== "folders") {
            let mimeFilter = "";
            if (input.type === "images") {
                mimeFilter = "AND v.mime_type LIKE 'image/%'";
            } else if (input.type === "documents") {
                mimeFilter =
                    "AND (v.mime_type LIKE '%pdf%' OR v.mime_type LIKE '%text%' OR v.mime_type LIKE '%word%')";
            }

            const filesRes = await query(
                `SELECT f.id, f.name, f.parent_id, f.updated_at,
                v.version_number, v.size_bytes, v.mime_type,
                u.full_name AS owner_name,
                similarity(f.name, $1) AS rank
         FROM files f
         LEFT JOIN file_versions v ON f.current_version_id = v.id
         JOIN users u ON f.owner_id = u.id
         WHERE f.deleted_at IS NULL
           ${mimeFilter}
           AND (
             f.owner_id = $2
             OR f.id IN (
               SELECT resource_id FROM permissions 
               WHERE resource_type = 'file' AND user_id = $2
             )
             OR f.parent_id IN (
               SELECT resource_id FROM permissions 
               WHERE resource_type = 'folder' AND user_id = $2
             )
           )
           AND (f.name ILIKE $3 OR similarity(f.name, $1) > 0.2)
         ORDER BY rank DESC, f.name ASC
         LIMIT $4`,
                [searchTerm, userId, searchPattern, limit],
            );
            matchedFiles = filesRes.rows;
        }

        return {
            query: searchTerm,
            folders: matchedFolders,
            files: matchedFiles,
            totalMatches: matchedFolders.length + matchedFiles.length,
        };
    }
}
