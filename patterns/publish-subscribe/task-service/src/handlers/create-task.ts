import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { lambdaRequestTracker } from 'pino-lambda';
import { ZodError } from 'zod';

import { CreateTaskDtoSchema } from '../models/create-task-dto.js';
import { createTask } from '../services/task-service.js';
import { badRequest, created, internalServerError } from '../utils/apigateway-response.js';
import { logger } from '../utils/logger.js';

/**
 * Lambda request tracker middleware for logging.
 * @see https://www.npmjs.com/package/pino-lambda#best-practices
 */
const withRequestTracking = lambdaRequestTracker();

/**
 * Lambda handler for creating a new task
 * Handles POST requests from API Gateway to create a task in DynamoDB
 *
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with created task or error message
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  withRequestTracking(event, context);
  logger.info('[CreateTask] > handler', {
    requestId: event.requestContext.requestId,
    event,
  });

  try {
    // Parse and validate request body
    if (!event.body) {
      logger.warn('[CreateTask] < handler - missing request body', {
        requestId: event.requestContext.requestId,
      });
      return badRequest('Request body is required');
    }

    let requestBody: unknown;
    try {
      requestBody = JSON.parse(event.body);
    } catch (_error) {
      logger.warn('[CreateTask] < handler - invalid JSON in request body', {
        requestId: event.requestContext.requestId,
      });
      return badRequest('Invalid JSON in request body');
    }

    // Validate request body against schema
    const validatedDto = CreateTaskDtoSchema.parse(requestBody);

    // Create the task
    const task = await createTask(validatedDto);

    logger.info('[CreateTask] < handler - successfully created task', {
      id: task.id,
      requestId: event.requestContext.requestId,
    });

    return created(task);
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessages = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
      logger.warn('[CreateTask] < handler - validation error', {
        errors: error.issues,
        requestId: event.requestContext.requestId,
      });
      return badRequest(`Validation failed: ${errorMessages}`);
    }

    logger.error('[CreateTask] < handler - failed to create task', error as Error, {
      requestId: event.requestContext.requestId,
    });

    return internalServerError('Failed to create task');
  }
};
