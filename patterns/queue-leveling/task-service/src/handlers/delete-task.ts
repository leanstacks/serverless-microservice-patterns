import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { lambdaRequestTracker } from 'pino-lambda';

import { deleteTask } from '../services/task-service.js';
import { internalServerError, noContent, notFound } from '../utils/apigateway-response.js';
import { logger } from '../utils/logger.js';

/**
 * Lambda request tracker middleware for logging.
 * @see https://www.npmjs.com/package/pino-lambda#best-practices
 */
const withRequestTracking = lambdaRequestTracker();

/**
 * Lambda handler for deleting a task by ID
 * Handles DELETE requests from API Gateway to delete a specific task from DynamoDB
 *
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with 204 status on success or error message
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  withRequestTracking(event, context);
  logger.info('[DeleteTask] > handler', {
    requestId: event.requestContext.requestId,
    event,
  });

  try {
    const taskId = event.pathParameters?.taskId;

    if (!taskId) {
      logger.warn('[DeleteTask] < handler - missing taskId path parameter', {
        requestId: event.requestContext.requestId,
      });
      return notFound('Task not found');
    }

    const deleted = await deleteTask(taskId);

    if (!deleted) {
      logger.info('[DeleteTask] < handler - task not found', {
        taskId,
        requestId: event.requestContext.requestId,
      });
      return notFound('Task not found');
    }

    logger.info('[DeleteTask] < handler - successfully deleted task', {
      taskId,
      requestId: event.requestContext.requestId,
    });

    return noContent();
  } catch (error) {
    logger.error('[DeleteTask] < handler - failed to delete task', error as Error, {
      requestId: event.requestContext.requestId,
    });

    return internalServerError('Failed to delete task');
  }
};
