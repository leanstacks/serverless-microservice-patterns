import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ZodError } from 'zod';

import { CreateTaskDtoSchema } from '../models/create-task-dto.js';
import { createTask } from '../services/task-service.js';
import { badRequest, created, internalServerError } from '../utils/apigateway-response.js';
import { logger, withRequestTracking } from '../utils/logger.js';

/**
 * Lambda handler for creating a new task
 * Handles POST requests from API Gateway to create a task in DynamoDB
 *
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with created task or error message
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  withRequestTracking(event, context);
  logger.info('[CreateTaskHandler] > handler');
  logger.debug({ event, context }, '[CreateTaskHandler] - event');

  try {
    // Parse and validate request body
    if (!event.body) {
      logger.warn('[CreateTaskHandler] < handler - missing request body');
      return badRequest('Request body is required');
    }

    let requestBody: unknown;
    try {
      requestBody = JSON.parse(event.body);
    } catch (_error) {
      logger.warn('[CreateTaskHandler] < handler - invalid JSON in request body');
      return badRequest('Invalid JSON in request body');
    }

    // Validate request body against schema
    const validatedDto = CreateTaskDtoSchema.parse(requestBody);

    // Create the task
    const task = await createTask(validatedDto);

    logger.info({ taskId: task.id }, '[CreateTaskHandler] < handler - successfully created task');
    return created(task);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationMessages = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
      logger.warn({ error, validationMessages }, '[CreateTaskHandler] < handler - validation error');
      return badRequest(`Validation failed: ${validationMessages}`);
    }

    logger.error({ error }, '[CreateTaskHandler] < handler - failed to create task');
    return internalServerError('Failed to create task');
  }
};
