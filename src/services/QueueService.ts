import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { QueueConfig } from '../config/queue.config';
import { QueueMessage, QueueJobOptions, QueueStats } from '../models/QueueMessage';
import { logger } from '../utils/Logger';

/**
 * Queue Service using BullMQ
 */
export class QueueService {
  private queue: Queue<QueueMessage>;
  private queueEvents: QueueEvents;
  private redisConnection: IORedis;
  private config: QueueConfig;

  constructor(config: QueueConfig) {
    this.config = config;

    // Create Redis connection
    this.redisConnection = new IORedis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null,
    });

    // Create queue
    this.queue = new Queue<QueueMessage>(config.queueName, {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: config.retryMaxAttempts,
        backoff: {
          type: 'exponential',
          delay: config.retryDelayMs,
        },
        removeOnComplete: 1000, // Keep last 1000 completed jobs
        removeOnFail: 5000, // Keep last 5000 failed jobs
      },
    });

    // Create queue events listener
    this.queueEvents = new QueueEvents(config.queueName, {
      connection: this.redisConnection.duplicate(),
    });

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.queueEvents.on('completed', ({ jobId }) => {
      logger.debug('Job completed', { jobId });
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error('Job failed', { jobId, failedReason });
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      logger.debug('Job progress', { jobId, progress: data });
    });
  }

  /**
   * Add job to queue
   */
  async addJob(message: QueueMessage, options?: QueueJobOptions): Promise<string> {
    try {
      const job = await this.queue.add(
        `validate-${message.documentId}`,
        message,
        options
      );

      logger.info('Job added to queue', {
        jobId: job.id,
        documentId: message.documentId,
        questionId: message.failedDocument.question_id,
      });

      return job.id || 'unknown';
    } catch (error) {
      logger.error('Failed to add job to queue', {
        documentId: message.documentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Create worker to process jobs
   */
  createWorker(
    processor: (job: Job<QueueMessage>) => Promise<void>
  ): Worker<QueueMessage> {
    const worker = new Worker<QueueMessage>(
      this.config.queueName,
      processor,
      {
        connection: this.redisConnection.duplicate(),
        concurrency: this.config.concurrency,
      }
    );

    // Worker event listeners
    worker.on('completed', (job) => {
      logger.info('Worker completed job', {
        jobId: job.id,
        documentId: job.data.documentId,
      });
    });

    worker.on('failed', (job, err) => {
      logger.error('Worker failed job', {
        jobId: job?.id,
        documentId: job?.data.documentId,
        error: err.message,
        attemptsMade: job?.attemptsMade,
      });
    });

    worker.on('error', (err) => {
      logger.error('Worker error', { error: err.message });
    });

    logger.info('Worker created', {
      queueName: this.config.queueName,
      concurrency: this.config.concurrency,
    });

    return worker;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
      };
    } catch (error) {
      logger.error('Failed to get queue stats', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job<QueueMessage> | undefined> {
    try {
      return await this.queue.getJob(jobId);
    } catch (error) {
      logger.error('Failed to get job', {
        jobId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Pause queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    logger.info('Queue paused');
  }

  /**
   * Resume queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    logger.info('Queue resumed');
  }

  /**
   * Close queue and connections
   */
  async close(): Promise<void> {
    try {
      await this.queue.close();
      await this.queueEvents.close();
      await this.redisConnection.quit();
      logger.info('Queue service closed');
    } catch (error) {
      logger.error('Error closing queue service', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Clean old jobs
   */
  async clean(grace: number = 86400000): Promise<void> {
    // Clean jobs older than grace period (default 24 hours)
    await this.queue.clean(grace, 1000, 'completed');
    await this.queue.clean(grace, 1000, 'failed');
    logger.info('Queue cleaned', { gracePeriodMs: grace });
  }
}
