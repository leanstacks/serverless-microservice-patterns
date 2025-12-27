import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

import { deleteTask } from '../services/task-service.js';
import { internalServerError, noContent, notFound } from '../utils/apigateway-response.js';
import { logger, withRequestTracking } from '../utils/logger.js';

/**
 * Lambda handler for deleting a task by ID
 * Handles DELETE requests from API Gateway to delete a specific task from DynamoDB
 *
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with 204 status on success or error message
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  withRequestTracking(event, context);
  logger.info('[DeleteTaskHandler] > handler');
  logger.debug({ event, context }, '[DeleteTaskHandler] handler - APIGatewayProxyEvent');

  try {
    const taskId = event.pathParameters?.taskId;

    if (!taskId) {
      logger.warn('[DeleteTaskHandler] < handler - missing taskId path parameter');
      return notFound('Task not found');
    }

    const deleted = await deleteTask(taskId);

    if (!deleted) {
      logger.info({ taskId }, '[DeleteTaskHandler] < handler - task not found');
      return notFound('Task not found');
    }

    logger.info({ taskId }, '[DeleteTaskHandler] < handler - successfully deleted task');
    return noContent();
  } catch (error) {
    logger.error({ error }, '[DeleteTaskHandler] < handler - failed to delete task');

    return internalServerError('Failed to delete task');
  }
};
