import { APIGatewayAuthorizerResult } from 'aws-lambda';

import { logger } from '@/utils/logger';
import { TokenValidationResult } from '@/models/token-validation';

/**
 * Validates the authorization token from the API Gateway request
 * In this example, we perform a simple token validation.
 * In a real-world scenario, you would validate against a token service, JWT, etc.
 *
 * @param token - The authorization token from the request
 * @returns Token validation result
 */
export const validateToken = (token: string): TokenValidationResult => {
  logger.debug('[TokenAuthorizerService] > validateToken', { tokenLength: token.length });

  // For demonstration, we accept any token that starts with 'Bearer '
  // In production, you would:
  // 1. Verify JWT signature
  // 2. Check token expiration
  // 3. Validate against token service
  // 4. Check token scopes/claims

  if (!token || !token.startsWith('Bearer ')) {
    logger.warn('[TokenAuthorizerService] - validateToken - Invalid token format');
    return {
      isValid: false,
      error: 'Invalid token format',
    };
  }

  const tokenValue = token.substring(7); // Remove 'Bearer ' prefix

  // Simple validation: token must be non-empty and not just whitespace
  if (!tokenValue || !tokenValue.trim()) {
    logger.warn('[TokenAuthorizerService] - validateToken - Empty token value');
    return {
      isValid: false,
      error: 'Empty token value',
    };
  }

  // For demonstration purposes, accept the token
  // Extract a principal ID from the token (in real scenarios, decode JWT)
  const principalId = `user-${tokenValue.substring(0, 8)}`;

  logger.info('[TokenAuthorizerService] < validateToken - Token validated successfully', {
    principalId,
  });

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
export const buildPolicy = (
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string>,
): APIGatewayAuthorizerResult => {
  logger.debug('[TokenAuthorizerService] > buildPolicy', {
    principalId,
    effect,
    resource,
    context,
  });

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

  logger.debug('[TokenAuthorizerService] < buildPolicy', { policy: authResult });
  return authResult;
};
