import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { lambdaRequestTracker } from 'pino-lambda';

import { Task } from '../models/task.js';
import { invokeLambda } from '../utils/lambda-client.js';
import { internalServerError, ok } from '../utils/apigateway-response.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Lambda request tracker middleware for logging.
 * @see https://www.npmjs.com/package/pino-lambda#best-practices
 */
const withRequestTracking = lambdaRequestTracker();

/**
 * Response type for the Daily Planner handler
 */
interface DailyPlannerResponse {
  tasks: Task[];
}

/**
 * Lambda handler for the Daily Planner function
 * Demonstrates the Internal API pattern by synchronously invoking the ListTasks Lambda function
 *
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with daily planner data containing tasks or error message
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  withRequestTracking(event, context);
  logger.info('[DailyPlanner] > handler', {
    requestId: event.requestContext.requestId,
    event,
  });

  try {
    if (!config.LIST_TASKS_FUNCTION_NAME) {
      logger.error(
        '[DailyPlanner] < handler - LIST_TASKS_FUNCTION_NAME not configured',
        new Error('Missing environment variable'),
        {
          requestId: event.requestContext.requestId,
        },
      );
      return internalServerError('Daily planner service is not properly configured');
    }

    // Invoke the ListTasks Lambda function synchronously
    logger.debug('[DailyPlanner] handler - invoking ListTasks function', {
      functionName: config.LIST_TASKS_FUNCTION_NAME,
      requestId: event.requestContext.requestId,
    });

    const listTasksResponse = await invokeLambda<APIGatewayProxyResult>(config.LIST_TASKS_FUNCTION_NAME, {
      httpMethod: 'GET',
      path: '/tasks',
      requestContext: event.requestContext,
    });

    // Parse the tasks from the ListTasks response
    if (!listTasksResponse.body) {
      logger.warn('[DailyPlanner] < handler - ListTasks returned empty body', {
        requestId: event.requestContext.requestId,
      });
      return ok({ tasks: [] } as DailyPlannerResponse);
    }

    const tasks = JSON.parse(listTasksResponse.body) as Task[];

    const response: DailyPlannerResponse = {
      tasks,
    };

    logger.info('[DailyPlanner] < handler - successfully retrieved daily planner data', {
      taskCount: tasks.length,
      requestId: event.requestContext.requestId,
    });

    return ok(response);
  } catch (error) {
    logger.error('[DailyPlanner] < handler - failed to retrieve daily planner data', error as Error, {
      requestId: event.requestContext.requestId,
    });

    return internalServerError('Failed to retrieve daily planner data');
  }
};
