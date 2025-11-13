import { MongoDBService } from './MongoDBService';
import { SchemaValidator } from '../validators/SchemaValidator';
import { CodingQuestion } from '../models/CodingQuestion';
import { logger } from '../utils/Logger';
import { RetryHelper, RetryOptions } from '../utils/RetryHelper';

/**
 * Updater Service - Safely updates MongoDB documents
 */
export class UpdaterService {
  private mongoService: MongoDBService;
  private validator: SchemaValidator;
  private retryOptions: RetryOptions;

  constructor(
    mongoService: MongoDBService,
    retryMaxAttempts: number = 3,
    retryDelayMs: number = 5000
  ) {
    this.mongoService = mongoService;
    this.validator = new SchemaValidator();
    this.retryOptions = RetryHelper.createOptions(retryMaxAttempts, retryDelayMs, true);
  }

  /**
   * Update document in MongoDB after validation
   * CRITICAL: This method ONLY updates existing documents, NEVER creates new ones
   */
  async updateDocument(documentId: string, correctedDocument: CodingQuestion): Promise<boolean> {
    try {
      logger.info('Starting document update process', {
        documentId,
        questionId: correctedDocument.question_id,
      });

      // Step 1: Validate corrected document
      const validationResult = this.validator.validate(correctedDocument);

      if (!validationResult.isValid) {
        logger.error('Corrected document failed validation', {
          documentId,
          errors: validationResult.errors,
        });
        throw new Error(
          `Corrected document is still invalid: ${validationResult.errors.length} errors found`
        );
      }

      logger.info('Corrected document passed validation', {
        documentId,
        questionId: correctedDocument.question_id,
      });

      // Step 2: Verify document exists before updating
      const existingDoc = await this.mongoService.findById(documentId);
      if (!existingDoc) {
        logger.error('Document not found in database', { documentId });
        throw new Error(`Document with ID ${documentId} not found. Cannot update non-existent document.`);
      }

      logger.debug('Existing document found, proceeding with update', {
        documentId,
        existingQuestionId: existingDoc.question_id,
      });

      // Step 3: Update with retry logic
      const success = await RetryHelper.execute(
        async () => {
          return await this.mongoService.updateDocument(documentId, correctedDocument);
        },
        this.retryOptions,
        `Update document ${documentId}`
      );

      if (success) {
        logger.info('Document updated successfully', {
          documentId,
          questionId: correctedDocument.question_id,
        });
      } else {
        logger.error('Document update returned false', { documentId });
      }

      return success;
    } catch (error) {
      logger.error('Failed to update document', {
        documentId,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  /**
   * Validate and update document (convenience method)
   */
  async validateAndUpdate(
    documentId: string,
    correctedDocument: CodingQuestion
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const success = await this.updateDocument(documentId, correctedDocument);
      return { success };
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Update multiple documents
   */
  async updateBatch(
    updates: Array<{ documentId: string; correctedDocument: CodingQuestion }>
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ documentId: string; error: string }>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ documentId: string; error: string }>,
    };

    for (const update of updates) {
      try {
        const success = await this.updateDocument(
          update.documentId,
          update.correctedDocument
        );
        if (success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push({
            documentId: update.documentId,
            error: 'Update returned false',
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          documentId: update.documentId,
          error: (error as Error).message,
        });
      }
    }

    logger.info('Batch update completed', results);
    return results;
  }
}
