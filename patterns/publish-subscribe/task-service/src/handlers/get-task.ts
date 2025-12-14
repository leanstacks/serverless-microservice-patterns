import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { lambdaRequestTracker } from 'pino-lambda';

import { getTask } from '../services/task-service.js';
import { internalServerError, notFound, ok } from '../utils/apigateway-response.js';
import { logger } from '../utils/logger.js';

/**
 * Lambda request tracker middleware for logging.
 * @see https://www.npmjs.com/package/pino-lambda#best-practices
 */
const withRequestTracking = lambdaRequestTracker();

/**
 * Lambda handler for retrieving a task by ID
 * Handles GET requests from API Gateway to retrieve a specific task from DynamoDB
 *
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with task or error message
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  withRequestTracking(event, context);
  logger.info('[GetTask] > handler', {
    requestId: event.requestContext.requestId,
    event,
  });

  try {
    const taskId = event.pathParameters?.taskId;

    if (!taskId) {
      logger.warn('[GetTask] < handler - missing taskId path parameter', {
        requestId: event.requestContext.requestId,
      });
      return notFound('Task not found');
    }

    const task = await getTask(taskId);

    if (!task) {
      logger.info('[GetTask] < handler - task not found', {
        taskId,
        requestId: event.requestContext.requestId,
      });
      return notFound('Task not found');
    }

    logger.info('[GetTask] < handler - successfully retrieved task', {
      taskId,
      requestId: event.requestContext.requestId,
    });

    return ok(task);
  } catch (error) {
    logger.error('[GetTask] < handler - failed to get task', error as Error, {
      requestId: event.requestContext.requestId,
    });

    return internalServerError('Failed to retrieve task');
  }
};
