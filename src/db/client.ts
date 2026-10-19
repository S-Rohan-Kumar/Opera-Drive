import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err);
});

export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
): Promise<QueryResult<T>> {
    const start = Date.now();
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === "development" && duration > 100) {
        console.warn(`Slow query (${duration}ms): ${text}`);
    }
    return res;
}

export async function getClient(): Promise<PoolClient> {
    return await pool.connect();
}

export async function testDbConnection(): Promise<boolean> {
    try {
        const res = await query("SELECT NOW() AS current_time");
        return !!res.rows[0];
    } catch (err) {
        console.error("Failed to connect to PostgreSQL:", err);
        return false;
    }
}
