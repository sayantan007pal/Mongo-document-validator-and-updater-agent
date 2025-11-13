import { logger } from './Logger';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry Helper Utility
 */
export class RetryHelper {
  /**
   * Execute function with retry logic
   */
  static async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions,
    context: string = 'Operation'
  ): Promise<T> {
    const { maxAttempts, delayMs, exponentialBackoff = false, onRetry } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          logger.error(`${context} failed after ${maxAttempts} attempts`, {
            error: lastError.message,
            stack: lastError.stack,
          });
          throw lastError;
        }

        const delay = exponentialBackoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;

        logger.warn(`${context} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`, {
          error: lastError.message,
        });

        if (onRetry) {
          onRetry(attempt, lastError);
        }

        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Retry failed');
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create retry options from config
   */
  static createOptions(maxAttempts: number, delayMs: number, exponentialBackoff = false): RetryOptions {
    return {
      maxAttempts,
      delayMs,
      exponentialBackoff,
    };
  }
}
