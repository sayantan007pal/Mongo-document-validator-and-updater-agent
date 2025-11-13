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
  backupDir: z.string().min(1).default('./failed_questions'),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
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
    backupDir: process.env.BACKUP_DIR || './failed_questions',
    logLevel: process.env.LOG_LEVEL || 'info',
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

    // Ensure backup directory is absolute path
    if (!path.isAbsolute(config.app.backupDir)) {
      config.app.backupDir = path.resolve(process.cwd(), config.app.backupDir);
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
