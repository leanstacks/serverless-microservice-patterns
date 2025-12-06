import pino from 'pino';
import { pinoLambdaDestination } from 'pino-lambda';

import { config } from './config';

/**
 * Initialize Pino logger with Lambda destination
 * @see https://www.npmjs.com/package/pino-lambda#best-practices
 */
const _lambdaDestination = pinoLambdaDestination();

/**
 * Pino logger instance
 */
const _logger = pino(
  {
    level: config.LOGGING_LEVEL,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  _lambdaDestination,
);

/**
 * Log levels with numeric values for comparison
 */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Check if a given log level should be logged based on configured level
 */
const _shouldLog = (level: LogLevel): boolean => {
  if (!config.LOGGING_ENABLED) return false;

  const configuredLevel = LOG_LEVELS[config.LOGGING_LEVEL as LogLevel];
  const requestedLevel = LOG_LEVELS[level];

  return requestedLevel >= configuredLevel;
};

/**
 * Internal logging function that logs messages in text format.
 */
const _logText = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
  switch (level) {
    case 'debug':
      console.debug(message, context);
      break;
    case 'info':
      console.info(message, context);
      break;
    case 'warn':
      console.warn(message, context);
      break;
    case 'error':
      console.error(message, context);
      break;
  }
};

/**
 * Internal logging function that logs messages in json format.
 */
const _logJson = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
  switch (level) {
    case 'debug':
      _logger.debug({ context }, message);
      break;
    case 'info':
      _logger.info({ context }, message);
      break;
    case 'warn':
      _logger.warn({ context }, message);
      break;
    case 'error':
      _logger.error({ context }, message);
      break;
  }
};

/**
 * Internal logging function that routes to appropriate formatter.
 */
const _log = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
  if (!_shouldLog(level)) return;

  if (config.LOGGING_FORMAT === 'json') {
    _logJson(level, message, context);
  } else {
    _logText(level, message, context);
  }
};

/**
 * Logger utility configured based on environment settings
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    _log('debug', message, context);
  },

  info(message: string, context?: Record<string, unknown>): void {
    _log('info', message, context);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    _log('warn', message, context);
  },

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const errorContext = error
      ? {
          ...context,
          errorMessage: error.message,
          stack: error.stack,
        }
      : context;

    _log('error', message, errorContext);
  },
};
