import { z } from 'zod';

/**
 * Queue Configuration Schema
 */
export const QueueConfigSchema = z.object({
  redis: z.object({
    host: z.string().min(1, 'Redis host is required'),
    port: z.number().int().positive(),
  }),
  queueName: z.string().min(1, 'Queue name is required'),
  concurrency: z.number().int().positive().default(5),
  retryMaxAttempts: z.number().int().positive().default(3),
  retryDelayMs: z.number().int().positive().default(5000),
});

export type QueueConfig = z.infer<typeof QueueConfigSchema>;

/**
 * Load Queue configuration from environment
 */
export function loadQueueConfig(): QueueConfig {
  return QueueConfigSchema.parse({
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    queueName: process.env.QUEUE_NAME || 'question-validation-queue',
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    retryMaxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '5000', 10),
  });
}
