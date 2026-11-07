import bcrypt from "bcryptjs";
import { query } from "../../db/client.js";
import { RegisterInput, LoginInput } from "./auth.schema.js";

export interface UserRecord {
    id: string;
    email: string;
    full_name: string;
    created_at: string;
}

export class AuthService {
    private static SALT_ROUNDS = 10;

    static async register(input: RegisterInput): Promise<UserRecord> {
        const existing = await query("SELECT id FROM users WHERE email = $1", [
            input.email,
        ]);
        if (existing.rows.length > 0) {
            const err: any = new Error("A user with this email already exists");
            err.statusCode = 409;
            err.code = "EMAIL_ALREADY_EXISTS";
            throw err;
        }

        const passwordHash = await bcrypt.hash(
            input.password,
            this.SALT_ROUNDS,
        );

        const result = await query<UserRecord>(
            `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, created_at`,
            [input.email, passwordHash, input.fullName],
        );

        return result.rows[0];
    }

    static async validateCredentials(input: LoginInput): Promise<UserRecord> {
        const result = await query(
            `SELECT id, email, password_hash, full_name, created_at FROM users WHERE email = $1`,
            [input.email],
        );

        const user = result.rows[0];
        if (!user) {
            const err: any = new Error("Invalid email or password");
            err.statusCode = 401;
            err.code = "INVALID_CREDENTIALS";
            throw err;
        }

        const isValid = await bcrypt.compare(
            input.password,
            user.password_hash,
        );
        if (!isValid) {
            const err: any = new Error("Invalid email or password");
            err.statusCode = 401;
            err.code = "INVALID_CREDENTIALS";
            throw err;
        }

        return {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            created_at: user.created_at,
        };
    }

    static async findById(id: string): Promise<UserRecord | null> {
        const result = await query<UserRecord>(
            `SELECT id, email, full_name, created_at FROM users WHERE id = $1`,
            [id],
        );
        return result.rows[0] || null;
    }
}
