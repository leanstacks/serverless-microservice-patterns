import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { lambdaRequestTracker } from 'pino-lambda';
import { ZodError } from 'zod';

import { UpdateTaskDtoSchema } from '../models/update-task-dto.js';
import { updateTask } from '../services/task-service.js';
import { badRequest, internalServerError, notFound, ok } from '../utils/apigateway-response.js';
import { logger } from '../utils/logger.js';

/**
 * Lambda request tracker middleware for logging.
 * @see https://www.npmjs.com/package/pino-lambda#best-practices
 */
const withRequestTracking = lambdaRequestTracker();

/**
 * Lambda handler for updating an existing task
 * Handles PUT requests from API Gateway to update a task in DynamoDB
 *
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with updated task or error message
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  withRequestTracking(event, context);
  logger.info('[UpdateTask] > handler', {
    requestId: event.requestContext.requestId,
    event,
  });

  try {
    // Extract taskId from path parameters
    const taskId = event.pathParameters?.taskId;
    if (!taskId) {
      logger.warn('[UpdateTask] < handler - missing taskId', {
        requestId: event.requestContext.requestId,
      });
      return badRequest('Task ID is required');
    }

    // Parse and validate request body
    if (!event.body) {
      logger.warn('[UpdateTask] < handler - missing request body', {
        requestId: event.requestContext.requestId,
      });
      return badRequest('Request body is required');
    }

    let requestBody: unknown;
    try {
      requestBody = JSON.parse(event.body);
    } catch (_error) {
      logger.warn('[UpdateTask] < handler - invalid JSON in request body', {
        requestId: event.requestContext.requestId,
      });
      return badRequest('Invalid JSON in request body');
    }

    // Validate request body against schema
    const validatedDto = UpdateTaskDtoSchema.parse(requestBody);

    // Update the task
    const task = await updateTask(taskId, validatedDto);

    if (!task) {
      logger.info('[UpdateTask] < handler - task not found', {
        taskId,
        requestId: event.requestContext.requestId,
      });
      return notFound();
    }

    logger.info('[UpdateTask] < handler - successfully updated task', {
      id: task.id,
      requestId: event.requestContext.requestId,
    });

    return ok(task);
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessages = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
      logger.warn('[UpdateTask] < handler - validation error', {
        errors: error.issues,
        requestId: event.requestContext.requestId,
      });
      return badRequest(`Validation failed: ${errorMessages}`);
    }

    logger.error('[UpdateTask] < handler - failed to update task', error as Error, {
      requestId: event.requestContext.requestId,
    });

    return internalServerError('Failed to update task');
  }
};
