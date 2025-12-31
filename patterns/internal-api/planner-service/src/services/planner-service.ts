import { APIGatewayProxyResult } from 'aws-lambda';

import { DailyPlanner } from '../models/daily-planner.js';
import { Task } from '../models/task.js';
import { invokeLambdaSync } from '../utils/lambda-client.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Retrieves the daily planner data by invoking the ListTasks Lambda function
 * Demonstrates the Internal API pattern by synchronously invoking another Lambda
 *
 * @returns The daily planner data containing tasks
 * @throws Error if Lambda invocation fails
 */
export const getDailyPlanner = async (): Promise<DailyPlanner> => {
  logger.info('[PlannerService] > getDailyPlanner');

  try {
    // Invoke the ListTasks Lambda function synchronously
    logger.debug(
      {
        functionName: config.LIST_TASKS_FUNCTION_NAME,
      },
      '[PlannerService] getDailyPlanner - invoking ListTasks function',
    );

    const listTasksResponse = await invokeLambdaSync<APIGatewayProxyResult>(config.LIST_TASKS_FUNCTION_NAME, {});

    // Parse the tasks from the ListTasks response
    if (!listTasksResponse.body) {
      logger.warn('[PlannerService] < getDailyPlanner - ListTasks returned empty body');
      return { tasks: [] };
    }

    const tasks = JSON.parse(listTasksResponse.body) as Task[];

    const dailyPlanner: DailyPlanner = {
      tasks,
    };

    logger.info(
      {
        taskCount: tasks.length,
      },
      '[PlannerService] < getDailyPlanner - successfully retrieved daily planner data',
    );
    return dailyPlanner;
  } catch (error) {
    logger.error({ error }, '[PlannerService] < getDailyPlanner - failed to retrieve daily planner data');
    throw error;
  }
};
