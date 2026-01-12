import { APIGatewayProxyResult } from 'aws-lambda';

import { config } from './config';

/**
 * Creates a standardized API Gateway response with the given status code and body
 * Includes CORS headers to allow cross-origin requests
 */
export const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': config.CORS_ALLOW_ORIGIN,
    },
    body: JSON.stringify(body),
  };
};

// Common response patterns
export const ok = (body: unknown): APIGatewayProxyResult => createResponse(200, body);
export const created = (body: unknown): APIGatewayProxyResult => createResponse(201, body);
export const noContent = (): APIGatewayProxyResult => createResponse(204, {});
export const badRequest = (message = 'Bad Request'): APIGatewayProxyResult => createResponse(400, { message });
export const notFound = (message = 'Not Found'): APIGatewayProxyResult => createResponse(404, { message });
export const internalServerError = (message = 'Internal Server Error'): APIGatewayProxyResult =>
  createResponse(500, { message });
