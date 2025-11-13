import winston from 'winston';
import path from 'path';

/**
 * Logger Utility using Winston
 */
export class Logger {
  private static instance: winston.Logger;

  /**
   * Initialize logger with configuration
   */
  static initialize(logLevel: string = 'info'): winston.Logger {
    if (this.instance) {
      return this.instance;
    }

    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaStr = '';
        if (Object.keys(meta).length > 0) {
          metaStr = '\n' + JSON.stringify(meta, null, 2);
        }
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      })
    );

    this.instance = winston.createLogger({
      level: logLevel,
      format: logFormat,
      transports: [
        // Console output
        new winston.transports.Console({
          format: consoleFormat,
        }),
        // Error log file
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'error.log'),
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
        }),
        // Combined log file
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'combined.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 10,
        }),
      ],
    });

    return this.instance;
  }

  /**
   * Get logger instance
   */
  static getLogger(): winston.Logger {
    if (!this.instance) {
      this.initialize();
    }
    return this.instance;
  }

  /**
   * Create child logger with context
   */
  static child(context: object): winston.Logger {
    return this.getLogger().child(context);
  }
}

// Export default logger instance
export const logger = Logger.getLogger();
