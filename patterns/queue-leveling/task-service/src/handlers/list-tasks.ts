import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

import { listTasks } from '../services/task-service.js';
import { internalServerError, ok } from '../utils/apigateway-response.js';
import { logger, withRequestTracking } from '../utils/logger.js';

/**
 * Lambda handler for listing all tasks
 * Handles GET requests from API Gateway to retrieve all tasks from DynamoDB
 *
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with list of tasks or error message
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  withRequestTracking(event, context);
  logger.info('[ListTasksHandler] > handler');
  logger.debug({ event, context }, '[ListTasksHandler] - event');

  try {
    // Retrieve the list of tasks
    const tasks = await listTasks();

    // Return the list of tasks in the response
    logger.info({ count: tasks.length }, '[ListTasksHandler] < handler - successfully retrieved tasks');
    return ok(tasks);
  } catch (error) {
    // Handle other errors
    logger.error({ error }, '[ListTasksHandler] < handler - failed to list tasks');
    return internalServerError('Failed to retrieve tasks');
  }
};
