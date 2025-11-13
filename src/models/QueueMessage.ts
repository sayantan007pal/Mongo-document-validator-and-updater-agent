import { CodingQuestion } from './CodingQuestion';
import { ValidationError } from './ValidationError';

/**
 * Queue Message Structure
 */
export interface QueueMessage {
  documentId: string;
  failedDocument: CodingQuestion;
  validationErrors: ValidationError[];
  timestamp: string;
  retryCount: number;
}

/**
 * Queue Job Options
 */
export interface QueueJobOptions {
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

/**
 * Queue Statistics
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

/**
 * Processing Result
 */
export interface ProcessingResult {
  success: boolean;
  documentId: string;
  correctedDocument?: CodingQuestion;
  error?: string;
  retryCount: number;
}
