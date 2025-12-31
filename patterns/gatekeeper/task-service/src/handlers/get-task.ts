import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

import { getTask } from '../services/task-service.js';
import { internalServerError, notFound, ok } from '../utils/apigateway-response.js';
import { logger, withRequestTracking } from '../utils/logger.js';

/**
 * Lambda handler for retrieving a task by ID
 * Handles GET requests from API Gateway to retrieve a specific task from DynamoDB
 *
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with task or error message
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  withRequestTracking(event, context);
  logger.info('[GetTaskHandler] > handler');
  logger.debug({ event, context }, '[GetTaskHandler] - event');

  try {
    const taskId = event.pathParameters?.taskId;

    if (!taskId) {
      logger.warn('[GetTaskHandler] < handler - missing taskId path parameter');
      return notFound('Task not found');
    }

    const task = await getTask(taskId);

    if (!task) {
      logger.info({ taskId }, '[GetTaskHandler] < handler - task not found');
      return notFound('Task not found');
    }

    logger.info({ taskId }, '[GetTaskHandler] < handler - successfully retrieved task');
    return ok(task);
  } catch (error) {
    logger.error({ error }, '[GetTaskHandler] < handler - failed to get task');
    return internalServerError('Failed to retrieve task');
  }
};
