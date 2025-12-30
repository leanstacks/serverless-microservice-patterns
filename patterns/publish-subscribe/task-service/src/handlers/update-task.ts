import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ZodError } from 'zod';

import { UpdateTaskDtoSchema } from '../models/update-task-dto.js';
import { updateTask } from '../services/task-service.js';
import { badRequest, internalServerError, notFound, ok } from '../utils/apigateway-response.js';
import { logger, withRequestTracking } from '../utils/logger.js';

/**
 * Lambda handler for updating an existing task
 * Handles PUT requests from API Gateway to update a task in DynamoDB
 *
 * @param event - API Gateway proxy event
 * @param context - Lambda execution context
 * @returns API Gateway proxy result with updated task or error message
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  withRequestTracking(event, context);
  logger.info('[UpdateTaskHandler] > handler');
  logger.debug({ event, context }, '[UpdateTaskHandler] - event');

  try {
    // Extract taskId from path parameters
    const taskId = event.pathParameters?.taskId;
    if (!taskId) {
      logger.warn('[UpdateTaskHandler] < handler - missing taskId');
      return badRequest('Task ID is required');
    }

    // Parse and validate request body
    if (!event.body) {
      logger.warn('[UpdateTaskHandler] < handler - missing request body');
      return badRequest('Request body is required');
    }

    let requestBody: unknown;
    try {
      requestBody = JSON.parse(event.body);
    } catch (_error) {
      logger.warn('[UpdateTaskHandler] < handler - invalid JSON in request body');
      return badRequest('Invalid JSON in request body');
    }

    // Validate request body against schema
    const validatedDto = UpdateTaskDtoSchema.parse(requestBody);

    // Update the task
    const task = await updateTask(taskId, validatedDto);

    // If task was not found to update
    if (!task) {
      logger.info({ taskId }, '[UpdateTaskHandler] < handler - task not found');
      return notFound();
    }

    // Return success response
    logger.info({ taskId: task.id }, '[UpdateTaskHandler] < handler - successfully updated task');
    return ok(task);
  } catch (error) {
    // Handle validation errors
    if (error instanceof ZodError) {
      const validationMessages = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
      logger.warn({ error, validationMessages }, '[UpdateTaskHandler] < handler - validation error');
      return badRequest(`Validation failed: ${validationMessages}`);
    }

    // Handle unexpected errors
    logger.error({ error }, '[UpdateTaskHandler] < handler - failed to update task');
    return internalServerError('Failed to update task');
  }
};
