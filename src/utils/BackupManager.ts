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
 * Backup Manager for failed and corrected documents
 */
export class BackupManager {
  private failedQuestionsDir: string;
  private correctedQuestionsDir: string;

  constructor(failedQuestionsDir: string, correctedQuestionsDir: string) {
    this.failedQuestionsDir = failedQuestionsDir;
    this.correctedQuestionsDir = correctedQuestionsDir;
  }

  /**
   * Initialize backup directories
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.failedQuestionsDir, { recursive: true });
      await fs.mkdir(this.correctedQuestionsDir, { recursive: true });
      logger.info('Backup directories initialized', {
        failedQuestionsDir: this.failedQuestionsDir,
        correctedQuestionsDir: this.correctedQuestionsDir
      });
    } catch (error) {
      logger.error('Failed to initialize backup directories', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Save failed document to backup using slug and MongoDB ID naming
   */
  async saveBackup(
    document: CodingQuestion,
    validationErrors: ValidationError[]
  ): Promise<string> {
    try {
      const slug = (document as any).slug || 'unknown-slug';
      const mongoId = document._id ? document._id.toString() : 'no-id';
      const documentId = mongoId;

      const filename = `${slug}_${mongoId}.json`;
      const filepath = path.join(this.failedQuestionsDir, filename);

      const backupData: BackupData = {
        metadata: {
          backupTime: new Date().toISOString(),
          documentId,
          validationErrors,
        },
        originalDocument: document,
      };

      await fs.writeFile(filepath, JSON.stringify(backupData, null, 2), 'utf-8');

      logger.info('Failed document backed up successfully', {
        filepath,
        slug,
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
   * Save corrected document to corrected questions directory
   */
  async saveCorrectedDocument(
    document: CodingQuestion
  ): Promise<string> {
    try {
      const slug = (document as any).slug || 'unknown-slug';
      const mongoId = document._id ? document._id.toString() : 'no-id';

      const filename = `${slug}_${mongoId}.json`;
      const filepath = path.join(this.correctedQuestionsDir, filename);

      await fs.writeFile(filepath, JSON.stringify(document, null, 2), 'utf-8');

      logger.info('Corrected document saved successfully', {
        filepath,
        slug,
        documentId: mongoId,
      });

      return filepath;
    } catch (error) {
      logger.error('Failed to save corrected document', {
        questionId: document.question_id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Load backup by filename from failed questions directory
   */
  async loadBackup(filename: string): Promise<BackupData> {
    try {
      const filepath = path.join(this.failedQuestionsDir, filename);
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
   * Load corrected document by filename
   */
  async loadCorrectedDocument(filename: string): Promise<CodingQuestion> {
    try {
      const filepath = path.join(this.correctedQuestionsDir, filename);
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content) as CodingQuestion;
    } catch (error) {
      logger.error('Failed to load corrected document', {
        filename,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * List all failed question backup files
   */
  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.failedQuestionsDir);
      return files.filter((file) => file.endsWith('.json'));
    } catch (error) {
      logger.error('Failed to list backups', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * List all corrected question files
   */
  async listCorrectedDocuments(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.correctedQuestionsDir);
      return files.filter((file) => file.endsWith('.json'));
    } catch (error) {
      logger.error('Failed to list corrected documents', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete backup file from failed questions directory
   */
  async deleteBackup(filename: string): Promise<void> {
    try {
      const filepath = path.join(this.failedQuestionsDir, filename);
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
   * Delete corrected document file
   */
  async deleteCorrectedDocument(filename: string): Promise<void> {
    try {
      const filepath = path.join(this.correctedQuestionsDir, filename);
      await fs.unlink(filepath);
      logger.info('Corrected document deleted', { filename });
    } catch (error) {
      logger.error('Failed to delete corrected document', {
        filename,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get backup statistics for both directories
   */
  async getStats(): Promise<{
    totalFailedBackups: number;
    totalCorrectedDocuments: number;
    failedSize: number;
    correctedSize: number;
  }> {
    try {
      const failedFiles = await this.listBackups();
      const correctedFiles = await this.listCorrectedDocuments();
      let failedSize = 0;
      let correctedSize = 0;

      for (const file of failedFiles) {
        const filepath = path.join(this.failedQuestionsDir, file);
        const stats = await fs.stat(filepath);
        failedSize += stats.size;
      }

      for (const file of correctedFiles) {
        const filepath = path.join(this.correctedQuestionsDir, file);
        const stats = await fs.stat(filepath);
        correctedSize += stats.size;
      }

      return {
        totalFailedBackups: failedFiles.length,
        totalCorrectedDocuments: correctedFiles.length,
        failedSize,
        correctedSize,
      };
    } catch (error) {
      logger.error('Failed to get backup stats', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
