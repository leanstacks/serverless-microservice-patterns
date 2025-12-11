import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerHandler,
} from 'aws-lambda';

import { logger } from '@/utils/logger';
import { validateToken, buildPolicy } from '@/services/token-authorizer-service';

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
  logger.info('[TokenAuthorizer] > handler', { event });

  try {
    const token = event.authorizationToken;

    if (!token) {
      logger.warn('[TokenAuthorizer] No authorization token provided');
      throw new Error('No authorization token provided');
    }

    const validationResult = validateToken(token);

    if (!validationResult.isValid) {
      logger.warn('[TokenAuthorizer] Token validation failed', { error: validationResult.error });
      throw new Error(validationResult.error || 'Token validation failed');
    }

    const resourceParts = event.methodArn.split('/');
    const baseResource = resourceParts.slice(0, 2).join('/'); // e.g., arn:aws:execute-api:region:account-id:api-id/stage
    logger.debug('[TokenAuthorizer] Base resource extracted', { baseResource });

    const policy = buildPolicy(validationResult.principalId!, 'Allow', baseResource, validationResult.context);

    logger.info('[TokenAuthorizer] < handler - authorization allowed', {
      policy,
    });

    return policy;
  } catch (error) {
    logger.error('[TokenAuthorizer] < handler - authorization denied', error as Error);

    // Return explicit deny policy
    const methodArn = event.methodArn;
    const policy = buildPolicy('user', 'Deny', methodArn);

    return policy;
  }
};
