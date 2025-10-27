/**
 * Job Queue Service
 * 
 * This service manages background jobs using Bull (Redis-based queue).
 * 
 * What it does:
 * - Queues AI analysis jobs
 * - Queues export jobs
 * - Handles job retries on failure
 * - Tracks job progress
 * 
 * Why Bull?
 * - Reliable (uses Redis for persistence)
 * - Scalable (can add multiple workers)
 * - Built-in retry logic
 * - Progress tracking
 * - Job prioritization
 * 
 * Why queues?
 * - AI analysis takes time (don't block HTTP requests)
 * - Export operations take time
 * - Allows horizontal scaling (multiple workers)
 * - Handles failures gracefully (retries)
 */

import Bull from 'bull';
import Redis from 'ioredis';

/**
 * Redis connection configuration
 * 
 * Redis is used to store:
 * - Job queue data
 * - Job progress
 * - Job results
 */
const redisConfig = {
  redis: process.env['REDIS_URL'] || 'redis://localhost:6379',
  // Connection options
  maxRetriesPerRequest: null, // Required for Bull
  enableReadyCheck: false,
};

/**
 * AI Analysis Queue
 * 
 * Processes photos through AI blur detection
 * 
 * Job data structure:
 * {
 *   photoId: string,
 *   projectId: string,
 *   imageUrl: string,
 * }
 */
export const aiAnalysisQueue = new Bull('ai-analysis', redisConfig);

/**
 * Export Queue
 * 
 * Handles photo exports to Google Drive, Facebook, etc.
 * 
 * Job data structure:
 * {
 *   exportJobId: string,
 *   userId: string,
 *   projectId: string,
 *   destination: string,
 *   photoIds: string[],
 *   config: object,
 * }
 */
export const exportQueue = new Bull('export', redisConfig);

/**
 * Thumbnail Generation Queue
 * 
 * Generates thumbnails for uploaded photos
 * 
 * Job data structure:
 * {
 *   photoId: string,
 *   imageUrl: string,
 * }
 */
export const thumbnailQueue = new Bull('thumbnail', redisConfig);

/**
 * Adds a photo to AI analysis queue
 * 
 * @param photoId - Photo ID
 * @param projectId - Project ID
 * @param imageUrl - URL of the image to analyze
 * @returns Job ID
 */
export async function queueAIAnalysis(
  photoId: string,
  projectId: string,
  imageUrl: string
): Promise<string> {
  const job = await aiAnalysisQueue.add(
    {
      photoId,
      projectId,
      imageUrl,
    },
    {
      // Job options
      attempts: 3, // Retry up to 3 times on failure
      backoff: {
        type: 'exponential', // Wait longer between each retry
        delay: 5000, // Start with 5 second delay
      },
      removeOnComplete: true, // Clean up completed jobs
      removeOnFail: false, // Keep failed jobs for debugging
    }
  );

  return job.id.toString();
}

/**
 * Adds an export job to queue
 * 
 * @param exportJobId - Export job ID
 * @param userId - User ID
 * @param projectId - Project ID
 * @param destination - Export destination
 * @param photoIds - Array of photo IDs to export
 * @param config - Destination-specific configuration
 * @returns Job ID
 */
export async function queueExport(
  exportJobId: string,
  userId: string,
  projectId: string,
  destination: string,
  photoIds: string[],
  config: any
): Promise<string> {
  const job = await exportQueue.add(
    {
      exportJobId,
      userId,
      projectId,
      destination,
      photoIds,
      config,
    },
    {
      attempts: 2, // Retry once on failure
      backoff: {
        type: 'fixed',
        delay: 10000, // Wait 10 seconds before retry
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  return job.id.toString();
}

/**
 * Adds thumbnail generation job to queue
 * 
 * @param photoId - Photo ID
 * @param imageUrl - URL of the image
 * @returns Job ID
 */
export async function queueThumbnailGeneration(
  photoId: string,
  imageUrl: string
): Promise<string> {
  const job = await thumbnailQueue.add(
    {
      photoId,
      imageUrl,
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  return job.id.toString();
}

/**
 * Gets job status
 * 
 * @param queue - Queue name
 * @param jobId - Job ID
 * @returns Job status and progress
 */
export async function getJobStatus(
  queue: 'ai-analysis' | 'export' | 'thumbnail',
  jobId: string
): Promise<{
  status: string;
  progress: number;
  result?: any;
  error?: string;
}> {
  let queueInstance: Bull.Queue;

  switch (queue) {
    case 'ai-analysis':
      queueInstance = aiAnalysisQueue;
      break;
    case 'export':
      queueInstance = exportQueue;
      break;
    case 'thumbnail':
      queueInstance = thumbnailQueue;
      break;
  }

  const job = await queueInstance.getJob(jobId);

  if (!job) {
    return {
      status: 'not_found',
      progress: 0,
    };
  }

  const state = await job.getState();
  const progress = job.progress();

  return {
    status: state,
    progress: typeof progress === 'number' ? progress : 0,
    result: job.returnvalue,
    error: job.failedReason,
  };
}

/**
 * Cancels a job
 * 
 * @param queue - Queue name
 * @param jobId - Job ID
 */
export async function cancelJob(
  queue: 'ai-analysis' | 'export' | 'thumbnail',
  jobId: string
): Promise<void> {
  let queueInstance: Bull.Queue;

  switch (queue) {
    case 'ai-analysis':
      queueInstance = aiAnalysisQueue;
      break;
    case 'export':
      queueInstance = exportQueue;
      break;
    case 'thumbnail':
      queueInstance = thumbnailQueue;
      break;
  }

  const job = await queueInstance.getJob(jobId);
  if (job) {
    await job.remove();
  }
}

/**
 * Gets queue statistics
 * 
 * @param queue - Queue name
 * @returns Queue stats
 */
export async function getQueueStats(
  queue: 'ai-analysis' | 'export' | 'thumbnail'
): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  let queueInstance: Bull.Queue;

  switch (queue) {
    case 'ai-analysis':
      queueInstance = aiAnalysisQueue;
      break;
    case 'export':
      queueInstance = exportQueue;
      break;
    case 'thumbnail':
      queueInstance = thumbnailQueue;
      break;
  }

  const [waiting, active, completed, failed] = await Promise.all([
    queueInstance.getWaitingCount(),
    queueInstance.getActiveCount(),
    queueInstance.getCompletedCount(),
    queueInstance.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

