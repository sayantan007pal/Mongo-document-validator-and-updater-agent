/**
 * Validation Error Model
 */
export interface ValidationError {
  field: string;
  message: string;
  code: ValidationErrorCode;
  value?: any;
}

export enum ValidationErrorCode {
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_TYPE = 'INVALID_TYPE',
  INVALID_VALUE = 'INVALID_VALUE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  EMPTY_ARRAY = 'EMPTY_ARRAY',
  EXTRA_FIELD = 'EXTRA_FIELD',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
}

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  documentId?: string;
}

/**
 * Helper to create validation errors
 */
export class ValidationErrorFactory {
  static missingField(field: string): ValidationError {
    return {
      field,
      message: `Required field "${field}" is missing`,
      code: ValidationErrorCode.MISSING_FIELD,
    };
  }

  static invalidType(field: string, expectedType: string, actualValue: any): ValidationError {
    return {
      field,
      message: `Field "${field}" has invalid type. Expected ${expectedType}, got ${typeof actualValue}`,
      code: ValidationErrorCode.INVALID_TYPE,
      value: actualValue,
    };
  }

  static invalidValue(field: string, message: string, value?: any): ValidationError {
    return {
      field,
      message: `Field "${field}": ${message}`,
      code: ValidationErrorCode.INVALID_VALUE,
      value,
    };
  }

  static invalidFormat(field: string, message: string, value?: any): ValidationError {
    return {
      field,
      message: `Field "${field}": ${message}`,
      code: ValidationErrorCode.INVALID_FORMAT,
      value,
    };
  }

  static emptyArray(field: string): ValidationError {
    return {
      field,
      message: `Array field "${field}" must not be empty`,
      code: ValidationErrorCode.EMPTY_ARRAY,
    };
  }

  static extraField(field: string): ValidationError {
    return {
      field,
      message: `Extra field "${field}" not allowed in schema`,
      code: ValidationErrorCode.EXTRA_FIELD,
    };
  }

  static constraintViolation(field: string, message: string): ValidationError {
    return {
      field,
      message: `Constraint violation in "${field}": ${message}`,
      code: ValidationErrorCode.CONSTRAINT_VIOLATION,
    };
  }
}
