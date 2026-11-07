import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('🔄 Starting database migration...');
  
  // 1. Read schema.sql content
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  let client;
  try {
    // 2. Dedicated client from connection pool for transaction
    client = await pool.connect();

    // Step A: Begin transaction
    await client.query('BEGIN');

    // Step B: Execute the schema DDL
    await client.query(sql);

    // Step C: Commit transaction
    await client.query('COMMIT');

    console.log('✅ Migrations applied successfully.');
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Allow direct CLI invocation: tsx src/db/migrate.ts
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Fatal error running migration:', err);
      process.exit(1);
    });
}
