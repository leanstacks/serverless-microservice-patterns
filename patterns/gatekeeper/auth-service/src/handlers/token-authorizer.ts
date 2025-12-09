import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerHandler,
} from 'aws-lambda';

import { logger } from '../utils/logger.js';

/**
 * Token validation result interface
 */
interface TokenValidationResult {
  isValid: boolean;
  principalId?: string;
  context?: Record<string, string>;
  error?: string;
}

/**
 * Validates the authorization token from the API Gateway request
 * In this example, we perform a simple token validation.
 * In a real-world scenario, you would validate against a token service, JWT, etc.
 *
 * @param token - The authorization token from the request
 * @returns Token validation result
 */
const validateToken = (token: string): TokenValidationResult => {
  logger.debug('[Authorize] > validateToken', { tokenLength: token.length });

  // For demonstration, we accept any token that starts with 'Bearer '
  // In production, you would:
  // 1. Verify JWT signature
  // 2. Check token expiration
  // 3. Validate against token service
  // 4. Check token scopes/claims

  if (!token || !token.startsWith('Bearer ')) {
    logger.warn('[Authorize] - validateToken - Invalid token format');
    return {
      isValid: false,
      error: 'Invalid token format',
    };
  }

  const tokenValue = token.substring(7); // Remove 'Bearer ' prefix

  // Simple validation: token must be non-empty and not just whitespace
  if (!tokenValue || !tokenValue.trim()) {
    logger.warn('[Authorize] - validateToken - Empty token value');
    return {
      isValid: false,
      error: 'Empty token value',
    };
  }

  // For demonstration purposes, accept the token
  // Extract a principal ID from the token (in real scenarios, decode JWT)
  const principalId = `user-${tokenValue.substring(0, 8)}`;

  logger.info('[Authorize] < validateToken - Token validated successfully', { principalId });

  return {
    isValid: true,
    principalId,
    context: {
      userId: principalId,
      tokenSource: 'header',
    },
  };
};

/**
 * Builds an IAM policy for API Gateway authorization
 *
 * @param principalId - The principal user identification associated with the token
 * @param effect - The effect (Allow or Deny)
 * @param resource - The resource ARN to authorize
 * @param context - Additional context to return to the Lambda function
 * @returns IAM authorization policy
 */
const buildPolicy = (
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string>,
): APIGatewayAuthorizerResult => {
  logger.debug('[Authorize] > buildPolicy', { principalId, effect, resource, context });
  const authResult: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource + '/*',
        },
      ],
    },
  };

  if (context) {
    authResult.context = context;
  }

  logger.debug('[Authorize] < buildPolicy', { policy: authResult });
  return authResult;
};

/**
 * Lambda handler for authorizing API Gateway requests
 * This is a token authorizer that validates the Authorization header
 *
 * @param event - API Gateway token authorizer event
 * @returns IAM policy for API Gateway
 */
export const handler: APIGatewayTokenAuthorizerHandler = async (
  event: APIGatewayTokenAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> => {
  // Note: withRequestTracking is primarily designed for HTTP events
  // For token authorizer, we manually log the authorization attempt
  logger.info('[Authorize] > handler', { event });

  try {
    const token = event.authorizationToken;

    if (!token) {
      logger.warn('[Authorize] No authorization token provided');
      throw new Error('No authorization token provided');
    }

    const validationResult = validateToken(token);

    if (!validationResult.isValid) {
      logger.warn('[Authorize] Token validation failed', { error: validationResult.error });
      throw new Error(validationResult.error || 'Token validation failed');
    }

    const resourceParts = event.methodArn.split('/');
    const baseResource = resourceParts.slice(0, 2).join('/'); // e.g., arn:aws:execute-api:region:account-id:api-id/stage
    logger.debug('[Authorize] Base resource extracted', { baseResource });

    const policy = buildPolicy(validationResult.principalId!, 'Allow', baseResource, validationResult.context);

    logger.info('[Authorize] < handler - authorization allowed', {
      policy,
    });

    return policy;
  } catch (error) {
    logger.error('[Authorize] < handler - authorization denied', error as Error);

    // Return explicit deny policy
    const methodArn = event.methodArn;
    const policy = buildPolicy('user', 'Deny', methodArn);

    return policy;
  }
};
