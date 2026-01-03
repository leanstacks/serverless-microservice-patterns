import pino from 'pino';
import {
  CloudwatchLogFormatter,
  lambdaRequestTracker,
  pinoLambdaDestination,
  StructuredLogFormatter,
} from 'pino-lambda';

import { config } from './config';

/**
 * Pino logger instance
 */
let _logger: pino.Logger | null = null;

/**
 * Creates a new, fully configured Pino logger instance.
 */
const _createLogger = (): pino.Logger => {
  const formatter = config.LOGGING_FORMAT === 'json' ? new StructuredLogFormatter() : new CloudwatchLogFormatter();

  const lambdaDestination = pinoLambdaDestination({
    formatter,
  });

  _logger = pino(
    {
      enabled: config.LOGGING_ENABLED,
      level: config.LOGGING_LEVEL,
    },
    lambdaDestination,
  );

  return _logger;
};

/**
 * Returns the singleton Pino logger instance.
 * @returns Pino logger instance
 *
 * @example
 * ```typescript
 * import { getLogger } from './utils/logger';
 *
 * const logger = getLogger();
 * logger.info('This is an informational message');
 * ```
 */
const getLogger = (): pino.Logger => {
  _logger ??= _createLogger();
  return _logger;
};

/**
 * Resets the logger instance (for testing purposes).
 */
export const resetLogger = (): void => {
  _logger = null;
};

/**
 * The application logger instance.
 *
 * @example
 * ```typescript
 * import { logger } from './utils/logger';
 *
 * logger.info('This is an informational message');
 * logger.error('This is an error message', new Error('Example error'));
 * ```
 */
export const logger = getLogger();

/**
 * Logger middleware which adds AWS Lambda attributes to log messages.
 *
 * @example
 * ```typescript
 * import { withRequestTracking } from '@leanstacks/lambda-utils';
 *
 * export const handler = async (event, context) => {
 *   withRequestTracking(event, context);
 *
 *   // Your Lambda handler logic here
 * };
 * ```
 */
export const withRequestTracking = lambdaRequestTracker();
