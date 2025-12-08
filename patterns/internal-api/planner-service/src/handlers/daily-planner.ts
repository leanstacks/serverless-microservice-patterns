import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { lambdaRequestTracker } from 'pino-lambda';

import { getDailyPlanner } from '../services/planner-service.js';
import { internalServerError, ok } from '../utils/apigateway-response.js';
import { logger } from '../utils/logger.js';

/**
 * Lambda request tracker middleware for logging.
 * @see https://www.npmjs.com/package/pino-lambda#best-practices
 */
const withRequestTracking = lambdaRequestTracker();

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
    event,
  });

  try {
    const dailyPlanner = await getDailyPlanner();

    logger.info('[DailyPlanner] < handler - successfully retrieved daily planner data', {
      taskCount: dailyPlanner.tasks.length,
    });

    return ok(dailyPlanner);
  } catch (error) {
    logger.error('[DailyPlanner] < handler - failed to retrieve daily planner data', error as Error);

    return internalServerError('Failed to retrieve daily planner data');
  }
};
