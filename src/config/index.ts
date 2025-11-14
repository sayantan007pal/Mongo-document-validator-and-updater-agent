import { z } from 'zod';
import dotenv from 'dotenv';
import { loadMongoDBConfig, MongoDBConfig } from './mongodb.config';
import { loadQueueConfig, QueueConfig } from './queue.config';
import { loadAIConfig, AIConfig } from './ai.config';
import path from 'path';

/**
 * Application Configuration Schema
 */
export const AppConfigSchema = z.object({
  batchSize: z.number().int().positive().default(100),
  failedQuestionsDir: z.string().min(1).default('./failed_questions_original'),
  correctedQuestionsDir: z.string().min(1).default('./corrected_questions'),
  failureReportPath: z.string().min(1).default('./AI_CORRECTION_FAILURES.md'),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  retryMaxAttempts: z.number().int().positive().default(3),
  retryDelayMs: z.number().int().positive().default(5000),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Complete Configuration
 */
export interface Config {
  mongodb: MongoDBConfig;
  queue: QueueConfig;
  ai: AIConfig;
  app: AppConfig;
}

/**
 * Load application configuration
 */
function loadAppConfig(): AppConfig {
  return AppConfigSchema.parse({
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
    failedQuestionsDir: process.env.FAILED_QUESTIONS_DIR || './failed_questions_original',
    correctedQuestionsDir: process.env.CORRECTED_QUESTIONS_DIR || './corrected_questions',
    failureReportPath: process.env.FAILURE_REPORT_PATH || './AI_CORRECTION_FAILURES.md',
    logLevel: process.env.LOG_LEVEL || 'info',
    retryMaxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '5000', 10),
  });
}

/**
 * Load and validate all configuration
 */
export function loadConfig(): Config {
  // Load environment variables
  dotenv.config();

  try {
    const config: Config = {
      mongodb: loadMongoDBConfig(),
      queue: loadQueueConfig(),
      ai: loadAIConfig(),
      app: loadAppConfig(),
    };

    // Ensure directories are absolute paths
    if (!path.isAbsolute(config.app.failedQuestionsDir)) {
      config.app.failedQuestionsDir = path.resolve(process.cwd(), config.app.failedQuestionsDir);
    }
    if (!path.isAbsolute(config.app.correctedQuestionsDir)) {
      config.app.correctedQuestionsDir = path.resolve(process.cwd(), config.app.correctedQuestionsDir);
    }
    if (!path.isAbsolute(config.app.failureReportPath)) {
      config.app.failureReportPath = path.resolve(process.cwd(), config.app.failureReportPath);
    }

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid configuration. Please check your .env file.');
    }
    throw error;
  }
}

/**
 * Validate configuration at startup
 */
export function validateConfig(config: Config): void {
  // Additional runtime validations
  const errors: string[] = [];

  // Check MongoDB URI format
  if (!config.mongodb.uri.startsWith('mongodb://') && !config.mongodb.uri.startsWith('mongodb+srv://')) {
    errors.push('MongoDB URI must start with mongodb:// or mongodb+srv://');
  }

  // Check API key is not placeholder
  if (config.ai.apiKey.includes('your_') || config.ai.apiKey.includes('placeholder')) {
    errors.push('Anthropic API key appears to be a placeholder. Please set a valid API key.');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}
