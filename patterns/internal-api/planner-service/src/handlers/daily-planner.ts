import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

import { getDailyPlanner } from '../services/planner-service.js';
import { internalServerError, ok } from '../utils/apigateway-response.js';
import { logger, withRequestTracking } from '../utils/logger.js';

/**
 * Lambda handler for the Daily Planner function
 * Demonstrates the Internal API pattern by synchronously invoking the ListTasks Lambda function
 *
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with daily planner data containing tasks or error message
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  withRequestTracking(event, context);
  logger.info('[DailyPlannerHandler] > handler');
  logger.debug({ event, context }, '[DailyPlannerHandler] > event');

  try {
    // Retrieve daily planner data
    const dailyPlanner = await getDailyPlanner();

    logger.info(
      {
        taskCount: dailyPlanner.tasks.length,
      },
      '[DailyPlannerHandler] < handler - successfully retrieved daily planner data',
    );

    // Return successful response with daily planner data
    return ok(dailyPlanner);
  } catch (error) {
    logger.error({ error }, '[DailyPlannerHandler] < handler - failed to retrieve daily planner data');
    // Return internal server error response
    return internalServerError('Failed to retrieve daily planner data');
  }
};
