import Anthropic from '@anthropic-ai/sdk';
import { AIConfig } from '../config/ai.config';
import { CodingQuestion } from '../models/CodingQuestion';
import { ValidationError } from '../models/ValidationError';
import { logger } from '../utils/Logger';
import { generateCorrectionPrompt, parseAIResponse } from '../prompts/correction-prompt';

/**
 * AI Processor Service using Claude API
 */
export class AIProcessorService {
  private client: Anthropic;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * Process and correct a document using AI
   */
  async correctDocument(
    document: CodingQuestion,
    validationErrors: ValidationError[]
  ): Promise<CodingQuestion> {
    try {
      logger.info('Processing document with AI', {
        documentId: document._id?.toString(),
        questionId: document.question_id,
        errorCount: validationErrors.length,
      });

      // Generate prompt
      const prompt = generateCorrectionPrompt(document, validationErrors);

      // Call Claude API
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text response
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in AI response');
      }

      const aiResponse = textContent.text;

      logger.debug('AI response received', {
        questionId: document.question_id,
        responseLength: aiResponse.length,
      });

      // Parse response
      const correctedDocument = parseAIResponse(aiResponse);

      // Ensure _id and question_id are preserved
      if (document._id) {
        correctedDocument._id = document._id;
      }
      if (document.question_id) {
        correctedDocument.question_id = document.question_id;
      }

      logger.info('Document corrected successfully by AI', {
        questionId: correctedDocument.question_id,
      });

      return correctedDocument;
    } catch (error) {
      logger.error('AI processing failed', {
        questionId: document.question_id,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  /**
   * Test AI connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Respond with "OK" if you can read this.',
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      const hasOK = textContent && textContent.type === 'text' && textContent.text.includes('OK');

      logger.info('AI connection test', { success: hasOK });
      return !!hasOK;
    } catch (error) {
      logger.error('AI connection test failed', {
        error: (error as Error).message,
      });
      return false;
    }
  }
}
