import { query } from "../../db/client.js";

export interface StorageUsage {
    quotaBytes: number;
    usedBytes: number;
    usagePercentage: number;
}

export class QuotaService {
    static async getStorageUsage(userId: string): Promise<StorageUsage> {
        const userRes = await query(
            `SELECT storage_quota_bytes FROM users WHERE id = $1`,
            [userId],
        );
        if (userRes.rows.length === 0) {
            const err: any = new Error("User not found");
            err.statusCode = 404;
            err.code = "USER_NOT_FOUND";
            throw err;
        }

        const quotaBytes = Number(userRes.rows[0].storage_quota_bytes);

        const usageRes = await query(
            `SELECT COALESCE(SUM(fv.size_bytes), 0) AS used_bytes
             FROM file_versions fv
             JOIN files f ON f.id = fv.file_id
             WHERE f.owner_id = $1`,
            [userId],
        );

        const usedBytes = Number(usageRes.rows[0].used_bytes);
        const usagePercentage =
            quotaBytes > 0
                ? Number(((usedBytes / quotaBytes) * 100).toFixed(2))
                : 0;

        return {
            quotaBytes,
            usedBytes,
            usagePercentage,
        };
    }

    static async checkQuota(
        userId: string,
        incomingSizeBytes: number,
    ): Promise<void> {
        const { quotaBytes, usedBytes } = await this.getStorageUsage(userId);
        if (usedBytes + incomingSizeBytes > quotaBytes) {
            const err: any = new Error("Storage quota exceeded");
            err.statusCode = 403;
            err.code = "STORAGE_QUOTA_EXCEEDED";
            throw err;
        }
    }
}
