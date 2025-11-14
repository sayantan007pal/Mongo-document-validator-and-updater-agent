import fs from 'fs/promises';
import { CodingQuestion } from '../models/CodingQuestion';
import { ValidationError } from '../models/ValidationError';
import { logger } from './Logger';

/**
 * Failure entry structure
 */
export interface FailureEntry {
  timestamp: string;
  slug: string;
  mongoId: string;
  title?: string;
  retryAttempts: number;
  failureReason: string;
  originalValidationErrors: ValidationError[];
  backupFilePath?: string;
}

/**
 * Failure Report Manager for tracking AI correction failures
 */
export class FailureReportManager {
  private reportPath: string;

  constructor(reportPath: string) {
    this.reportPath = reportPath;
  }

  /**
   * Initialize the failure report file with header if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      // Check if file exists
      try {
        await fs.access(this.reportPath);
        logger.info('Failure report file already exists', { path: this.reportPath });
      } catch {
        // File doesn't exist, create it with header
        const header = this.generateHeader();
        await fs.writeFile(this.reportPath, header, 'utf-8');
        logger.info('Failure report file created', { path: this.reportPath });
      }
    } catch (error) {
      logger.error('Failed to initialize failure report', {
        path: this.reportPath,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Generate the markdown header for the report
   */
  private generateHeader(): string {
    return `# AI Correction Failures Report

This file tracks all coding questions that could not be automatically corrected by the AI system (GPT-4). These questions require manual review and intervention.

**Last Updated:** ${new Date().toISOString()}

---

## Failed Corrections Summary

| Timestamp | Slug | MongoDB ID | Retry Attempts | Failure Reason | Error Count |
|-----------|------|------------|----------------|----------------|-------------|

---

## Detailed Failure Logs

`;
  }

  /**
   * Log a failure entry to the markdown file
   */
  async logFailure(entry: FailureEntry): Promise<void> {
    try {
      logger.info('Logging AI correction failure', {
        slug: entry.slug,
        mongoId: entry.mongoId,
      });

      // Read existing content
      let content = await fs.readFile(this.reportPath, 'utf-8');

      // Update the "Last Updated" timestamp
      content = content.replace(
        /\*\*Last Updated:\*\* .+/,
        `**Last Updated:** ${new Date().toISOString()}`
      );

      // Add table row entry
      const tableRow = this.generateTableRow(entry);
      const tableEndIndex = content.indexOf('---\n\n## Detailed Failure Logs');
      if (tableEndIndex !== -1) {
        content =
          content.slice(0, tableEndIndex) +
          tableRow +
          '\n' +
          content.slice(tableEndIndex);
      }

      // Add detailed entry
      const detailedEntry = this.generateDetailedEntry(entry);
      content += '\n' + detailedEntry;

      // Write back to file
      await fs.writeFile(this.reportPath, content, 'utf-8');

      logger.info('Failure logged successfully', {
        slug: entry.slug,
        mongoId: entry.mongoId,
      });
    } catch (error) {
      logger.error('Failed to log failure', {
        slug: entry.slug,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Generate a table row for the summary section
   */
  private generateTableRow(entry: FailureEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString().replace('T', ' ').substring(0, 19);
    const errorCount = entry.originalValidationErrors.length;
    const reason = entry.failureReason.substring(0, 50) + (entry.failureReason.length > 50 ? '...' : '');

    return `| ${timestamp} | ${entry.slug} | ${entry.mongoId} | ${entry.retryAttempts} | ${reason} | ${errorCount} |`;
  }

  /**
   * Generate a detailed entry for the detailed logs section
   */
  private generateDetailedEntry(entry: FailureEntry): string {
    const errorList = entry.originalValidationErrors
      .map((err, idx) => {
        const field = err.field || 'unknown';
        const message = err.message || 'No message';
        return `  ${idx + 1}. Field: "${field}" - ${message}`;
      })
      .join('\n');

    return `
### ${entry.slug} (${entry.mongoId})
- **Title:** ${entry.title || 'N/A'}
- **Failed At:** ${new Date(entry.timestamp).toISOString()}
- **Retry Attempts:** ${entry.retryAttempts}
- **Backup File:** \`${entry.backupFilePath || 'N/A'}\`
- **Original Validation Errors:**
${errorList}
- **Failure Reason:** ${entry.failureReason}
- **Action Required:** Manual correction needed. Review the validation errors and check if the prompt needs adjustment or if the question content is too complex for AI processing.

---
`;
  }

  /**
   * Get statistics about failures
   */
  async getStats(): Promise<{ totalFailures: number; lastUpdated: string }> {
    try {
      const content = await fs.readFile(this.reportPath, 'utf-8');

      // Count table rows (excluding header)
      const tableMatches = content.match(/^\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|$/gm);
      const totalFailures = tableMatches ? tableMatches.length - 1 : 0; // -1 for header row

      // Extract last updated timestamp
      const lastUpdatedMatch = content.match(/\*\*Last Updated:\*\* (.+)/);
      const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1] : 'Unknown';

      return { totalFailures, lastUpdated };
    } catch (error) {
      logger.error('Failed to get failure stats', {
        error: (error as Error).message,
      });
      return { totalFailures: 0, lastUpdated: 'Unknown' };
    }
  }

  /**
   * Create a failure entry from document and error details
   */
  static createFailureEntry(
    document: CodingQuestion,
    validationErrors: ValidationError[],
    failureReason: string,
    retryAttempts: number,
    backupFilePath?: string
  ): FailureEntry {
    return {
      timestamp: new Date().toISOString(),
      slug: (document as any).slug || 'unknown-slug',
      mongoId: document._id ? document._id.toString() : 'no-id',
      title: (document as any).title,
      retryAttempts,
      failureReason,
      originalValidationErrors: validationErrors,
      backupFilePath,
    };
  }
}
