import { Queue } from 'bullmq';
import { redisConnectionOptions } from './redis.js';

export const CLEANUP_QUEUE_NAME = 'opera-drive-cleanup';

export const cleanupQueue = new Queue(CLEANUP_QUEUE_NAME, {
  connection: redisConnectionOptions,
});

export async function scheduleRecurringCleanupJobs() {
  await cleanupQueue.upsertJobScheduler(
    'orphan-chunks-scheduler',
    { every: 60 * 60 * 1000 },
    {
      name: 'orphan-chunks-cleaner',
      data: {},
    }
  );

  await cleanupQueue.upsertJobScheduler(
    'trash-purger-scheduler',
    { every: 24 * 60 * 60 * 1000 },
    {
      name: 'trash-purger',
      data: { retentionDays: 30 },
    }
  );
}