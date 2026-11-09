import { Worker, Job } from 'bullmq';
import { CLEANUP_QUEUE_NAME, scheduleRecurringCleanupJobs } from '../../queue/queue.js';
import { redisConnectionOptions } from '../../queue/redis.js';
import { runOrphanCleaner } from './orphan-cleaner.worker.js';
import { runTrashPurger } from './trash-purger.worker.js';

let cleanupWorker: Worker | null = null;

export function startWorkers() {
  if (cleanupWorker) return cleanupWorker;

  cleanupWorker = new Worker(
    CLEANUP_QUEUE_NAME,
    async (job: Job) => {
      if (job.name === 'orphan-chunks-cleaner') {
        return await runOrphanCleaner();
      }

      if (job.name === 'trash-purger') {
        const retentionDays = job.data?.retentionDays ?? 30;
        return await runTrashPurger(retentionDays);
      }

      throw new Error(`Unknown job name: ${job.name}`);
    },
    {
      connection: redisConnectionOptions,
      concurrency: 2,
    }
  );

  cleanupWorker.on('completed', (job: Job, result: any) => {
    console.log(`[Worker] Job ${job.name} (${job.id}) completed:`, result);
  });

  cleanupWorker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`[Worker] Job ${job?.name} (${job?.id}) failed:`, err);
  });

  scheduleRecurringCleanupJobs().catch((err) => {
    console.error('Failed to schedule recurring cleanup jobs:', err);
  });

  return cleanupWorker;
}

export async function stopWorkers() {
  if (cleanupWorker) {
    await cleanupWorker.close();
    cleanupWorker = null;
  }
}