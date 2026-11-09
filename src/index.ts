import { env } from './config/env.js';
import { pool, testDbConnection } from './db/client.js';
import { buildServer } from './server.js';
import { ensureBucketExists, testMinioConnection } from './storage/minio.js';
import { startWorkers, stopWorkers } from './modules/workers/index.js';

async function main() {
  console.log('🚀 Starting Opera Drive Backend...');

  const dbConnected = await testDbConnection();
  if (dbConnected) {
    console.log('✅ PostgreSQL connected.');
  } else {
    console.warn('⚠️ PostgreSQL connection failed.');
  }

  const minioConnected = await testMinioConnection();
  if (minioConnected) {
    console.log('✅ MinIO connected.');
    await ensureBucketExists();
  } else {
    console.warn('⚠️ MinIO connection failed.');
  }

  const server = await buildServer();
  startWorkers();

  try {
    await server.listen({ port: env.PORT, host: env.HOST });
    console.log(`📡 Opera Drive API running at http://${env.HOST}:${env.PORT}`);
    console.log(`🩺 Health: http://localhost:${env.PORT}/health`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    await stopWorkers();
    await server.close();
    await pool.end();
    console.log('👋 Clean exit completed.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});