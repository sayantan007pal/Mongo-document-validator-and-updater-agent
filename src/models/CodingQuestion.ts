import { z } from 'zod';
import { ObjectId } from 'mongodb';

/**
 * Test Case Schema
 */
export const TestCaseSchema = z.object({
  id: z.number().int().positive(),
  input: z.string().min(1, 'Test case input must not be empty'),
  expectedOutput: z.string().min(1, 'Test case expected output must not be empty'),
  description: z.string().min(1, 'Test case description must not be empty'),
  original_input: z.string(),
  original_output: z.string(),
});

export type TestCase = z.infer<typeof TestCaseSchema>;

/**
 * Language Code Schema - All 5 languages required with non-empty strings
 */
export const LanguageCodeSchema = z.object({
  c: z.string().min(1, 'C code must not be empty'),
  cpp: z.string().min(1, 'C++ code must not be empty'),
  java: z.string().min(1, 'Java code must not be empty'),
  javascript: z.string().min(1, 'JavaScript code must not be empty'),
  python: z.string().min(1, 'Python code must not be empty'),
});

export type LanguageCode = z.infer<typeof LanguageCodeSchema>;

/**
 * Difficulty Literal Type
 */
export const DifficultySchema = z.enum(['Easy', 'Medium', 'Hard'], {
  errorMap: () => ({ message: 'Difficulty must be exactly "Easy", "Medium", or "Hard"' }),
});

export type Difficulty = z.infer<typeof DifficultySchema>;

/**
 * Slug Validation - must be lowercase with hyphens
 */
export const SlugSchema = z.string().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Slug must be lowercase with hyphens (e.g., "two-sum")'
);

/**
 * Complete Coding Question Schema
 */
export const CodingQuestionSchema = z.object({
  _id: z.any().optional(), // MongoDB ObjectId
  question_id: z.string().min(1, 'question_id is required'),
  title: z.string().min(1, 'Title is required'),
  difficulty: DifficultySchema,
  slug: SlugSchema,
  topic_tags: z.array(z.string()).min(1, 'At least one topic tag is required'),
  content: z.string().min(1, 'Content is required'),
  constraints: z.array(z.string()).min(1, 'At least one constraint is required'),
  testCases: z.array(TestCaseSchema).min(1, 'At least one test case is required'),
  starterCode: LanguageCodeSchema,
  solutionCode: LanguageCodeSchema,
  inputFormat: z.string().min(1, 'inputFormat is required'),
  outputFormat: z.string().min(1, 'outputFormat is required'),
}).strict(); // Reject extra fields

export type CodingQuestion = z.infer<typeof CodingQuestionSchema>;

/**
 * Additional runtime validations for specific requirements
 */
export class CodingQuestionValidator {
  /**
   * Validate that test cases use stdin/stdout format
   */
  static validateTestCaseFormat(testCase: TestCase): string[] {
    const errors: string[] = [];

    // Check if input looks like stdin format (lines, numbers, etc.)
    // Reject if it looks like variable assignment (e.g., "nums = [3,5]")
    if (testCase.input.includes('=') || testCase.input.includes('[') && testCase.input.includes(']')) {
      errors.push(`Test case ${testCase.id}: Input should be in stdin format, not variable assignment format`);
    }

    // Check if expectedOutput looks like stdout format
    if (testCase.expectedOutput.includes('=') ||
        (testCase.expectedOutput.includes('[') && testCase.expectedOutput.includes(']') && testCase.expectedOutput.includes(','))) {
      errors.push(`Test case ${testCase.id}: Expected output should be in stdout format, not data structure format`);
    }

    return errors;
  }

  /**
   * Validate inputFormat contains code blocks
   */
  static validateInputFormat(inputFormat: string): string[] {
    const errors: string[] = [];

    if (!inputFormat.includes('```')) {
      errors.push('inputFormat should contain code blocks with ``` markers');
    }

    return errors;
  }

  /**
   * Perform all custom validations
   */
  static performCustomValidations(question: CodingQuestion): string[] {
    const errors: string[] = [];

    // Validate test cases format
    question.testCases.forEach((testCase) => {
      errors.push(...this.validateTestCaseFormat(testCase));
    });

    // Validate inputFormat
    errors.push(...this.validateInputFormat(question.inputFormat));

    return errors;
  }
}

/**
 * Type guard to check if object has MongoDB _id
 */
export function hasMongoId(obj: any): obj is { _id: ObjectId } {
  return obj && obj._id && obj._id instanceof ObjectId;
}
