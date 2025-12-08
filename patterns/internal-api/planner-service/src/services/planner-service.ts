import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { DailyPlanner } from '../models/daily-planner.js';
import { Task } from '../models/task.js';
import { invokeLambda } from '../utils/lambda-client.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Retrieves the daily planner data by invoking the ListTasks Lambda function
 * Demonstrates the Internal API pattern by synchronously invoking another Lambda
 *
 * @param requestId - The request ID for logging purposes
 * @returns The daily planner data containing tasks
 * @throws Error if Lambda invocation fails
 */
export const getDailyPlanner = async (requestId: string): Promise<DailyPlanner> => {
  logger.info('[PlannerService] > getDailyPlanner', { requestId });

  try {
    // Invoke the ListTasks Lambda function synchronously
    logger.debug('[PlannerService] getDailyPlanner - invoking ListTasks function', {
      functionName: config.LIST_TASKS_FUNCTION_NAME,
      requestId,
    });

    const listTasksResponse = await invokeLambda<APIGatewayProxyResult>(config.LIST_TASKS_FUNCTION_NAME, {
      httpMethod: 'GET',
      path: '/tasks',
      requestContext: {
        requestId,
      } as APIGatewayProxyEvent['requestContext'],
    } as APIGatewayProxyEvent);

    // Parse the tasks from the ListTasks response
    if (!listTasksResponse.body) {
      logger.warn('[PlannerService] < getDailyPlanner - ListTasks returned empty body', {
        requestId,
      });
      return { tasks: [] };
    }

    const tasks = JSON.parse(listTasksResponse.body) as Task[];

    const dailyPlanner: DailyPlanner = {
      tasks,
    };

    logger.info('[PlannerService] < getDailyPlanner - successfully retrieved daily planner data', {
      taskCount: tasks.length,
      requestId,
    });

    return dailyPlanner;
  } catch (error) {
    logger.error('[PlannerService] < getDailyPlanner - failed to retrieve daily planner data', error as Error, {
      requestId,
    });
    throw error;
  }
};
