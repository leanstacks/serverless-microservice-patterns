import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

import { parseCsv } from '../services/csv-service.js';
import { badRequest, internalServerError, ok } from '../utils/apigateway-response.js';
import { logger, withRequestTracking } from '../utils/logger.js';

/**
 * Lambda handler for uploading CSV files containing Task records
 * Handles POST requests from API Gateway to upload and validate CSV files
 *
 * @param event - API Gateway proxy event
 * @param context - Lambda execution context
 * @returns API Gateway proxy result with validation status or error message
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  withRequestTracking(event, context);
  logger.info('[UploadCsvHandler] > handler');
  logger.debug({ event, context }, '[UploadCsvHandler] - event');

  try {
    // Validate that request body exists
    if (!event.body) {
      logger.warn('[UploadCsvHandler] < handler - missing request body');
      return badRequest('Request body is required');
    }

    // Decode body if base64 encoded
    let csvContent: string;
    if (event.isBase64Encoded) {
      try {
        csvContent = Buffer.from(event.body, 'base64').toString('utf-8');
      } catch (_error) {
        logger.warn('[UploadCsvHandler] < handler - failed to decode base64 content');
        return badRequest('Failed to decode file content');
      }
    } else {
      csvContent = event.body;
    }

    // Validate CSV content is not empty
    if (!csvContent.trim()) {
      logger.warn('[UploadCsvHandler] < handler - empty CSV content');
      return badRequest('CSV content is empty');
    }

    // Parse and validate CSV
    const tasks = parseCsv(csvContent);

    logger.info({ taskCount: tasks.length }, '[UploadCsvHandler] < handler - successfully validated CSV');
    return ok({
      message: 'CSV file validated successfully',
      taskCount: tasks.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Check if it's a CSV validation error
      if (error.message.includes('CSV validation failed') || error.message.includes('Failed to parse CSV')) {
        logger.warn({ error, message: error.message }, '[UploadCsvHandler] < handler - CSV validation error');
        return badRequest(error.message);
      }
    }

    logger.error({ error }, '[UploadCsvHandler] < handler - failed to process CSV upload');
    return internalServerError('Failed to process CSV upload');
  }
};
