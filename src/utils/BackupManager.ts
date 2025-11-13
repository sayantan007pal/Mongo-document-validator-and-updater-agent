import fs from 'fs/promises';
import path from 'path';
import { CodingQuestion } from '../models/CodingQuestion';
import { ValidationError } from '../models/ValidationError';
import { logger } from './Logger';

/**
 * Backup metadata structure
 */
interface BackupMetadata {
  backupTime: string;
  documentId: string;
  validationErrors: ValidationError[];
}

/**
 * Complete backup structure
 */
interface BackupData {
  metadata: BackupMetadata;
  originalDocument: CodingQuestion;
}

/**
 * Backup Manager for failed documents
 */
export class BackupManager {
  private backupDir: string;

  constructor(backupDir: string) {
    this.backupDir = backupDir;
  }

  /**
   * Initialize backup directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info('Backup directory initialized', { path: this.backupDir });
    } catch (error) {
      logger.error('Failed to initialize backup directory', {
        path: this.backupDir,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Save failed document to backup
   */
  async saveBackup(
    document: CodingQuestion,
    validationErrors: ValidationError[]
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const questionId = document.question_id || 'unknown';
      const documentId = document._id ? document._id.toString() : 'no-id';

      const filename = `${timestamp}_${questionId}.json`;
      const filepath = path.join(this.backupDir, filename);

      const backupData: BackupData = {
        metadata: {
          backupTime: new Date().toISOString(),
          documentId,
          validationErrors,
        },
        originalDocument: document,
      };

      await fs.writeFile(filepath, JSON.stringify(backupData, null, 2), 'utf-8');

      logger.info('Document backed up successfully', {
        filepath,
        questionId,
        documentId,
        errorCount: validationErrors.length,
      });

      return filepath;
    } catch (error) {
      logger.error('Failed to save backup', {
        questionId: document.question_id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Load backup by filename
   */
  async loadBackup(filename: string): Promise<BackupData> {
    try {
      const filepath = path.join(this.backupDir, filename);
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content) as BackupData;
    } catch (error) {
      logger.error('Failed to load backup', {
        filename,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * List all backup files
   */
  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      return files.filter((file) => file.endsWith('.json'));
    } catch (error) {
      logger.error('Failed to list backups', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete backup file
   */
  async deleteBackup(filename: string): Promise<void> {
    try {
      const filepath = path.join(this.backupDir, filename);
      await fs.unlink(filepath);
      logger.info('Backup deleted', { filename });
    } catch (error) {
      logger.error('Failed to delete backup', {
        filename,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get backup statistics
   */
  async getStats(): Promise<{ totalBackups: number; totalSize: number }> {
    try {
      const files = await this.listBackups();
      let totalSize = 0;

      for (const file of files) {
        const filepath = path.join(this.backupDir, file);
        const stats = await fs.stat(filepath);
        totalSize += stats.size;
      }

      return {
        totalBackups: files.length,
        totalSize,
      };
    } catch (error) {
      logger.error('Failed to get backup stats', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
