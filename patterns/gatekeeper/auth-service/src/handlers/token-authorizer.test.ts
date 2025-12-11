// Mock logger before importing handler
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('@/utils/logger', () => ({
  logger: mockLogger,
}));

// Mock the token authorizer service
jest.mock('@/services/token-authorizer-service', () => ({
  validateToken: jest.fn(),
  buildPolicy: jest.fn(),
}));

jest.mock('pino-lambda', () => ({
  lambdaRequestTracker: () => jest.fn(),
}));

describe('Authorize Handler', () => {
  let handler: typeof import('./token-authorizer').handler;
  let mockValidateToken: jest.Mock;
  let mockBuildPolicy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked functions
    const service = require('@/services/token-authorizer-service');
    mockValidateToken = service.validateToken;
    mockBuildPolicy = service.buildPolicy;

    // Import handler after mocks are set up
    handler = require('./token-authorizer').handler;
  });

  const mockMethodArn = 'arn:aws:execute-api:us-east-1:123456789012:abcdef/dev/GET/tasks';
  const expectedBaseResource = 'arn:aws:execute-api:us-east-1:123456789012:abcdef/dev';

  describe('Valid Authorization', () => {
    it('should allow requests with valid Bearer token', async () => {
      // Arrange
      const principalId = 'user-valid-test';
      const context = { userId: principalId, tokenSource: 'header' };
      const mockPolicy = {
        principalId,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: expectedBaseResource + '/*',
            },
          ],
        },
        context,
      };

      mockValidateToken.mockReturnValue({
        isValid: true,
        principalId,
        context,
      });
      mockBuildPolicy.mockReturnValue(mockPolicy);

      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: 'Bearer valid-test-token-12345',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect(mockValidateToken).toHaveBeenCalledWith('Bearer valid-test-token-12345');
      expect(mockBuildPolicy).toHaveBeenCalledWith(principalId, 'Allow', expectedBaseResource, context);
      expect(result.principalId).toBe(principalId);
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
      expect(result.context?.userId).toBeDefined();
      expect(result.context?.tokenSource).toBe('header');
    });

    it('should extract principal ID from validated token', async () => {
      // Arrange
      const principalId = 'user-testtoke';
      const context = { userId: principalId, tokenSource: 'header' };
      const mockPolicy = {
        principalId,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: expectedBaseResource + '/*',
            },
          ],
        },
        context,
      };

      mockValidateToken.mockReturnValue({
        isValid: true,
        principalId,
        context,
      });
      mockBuildPolicy.mockReturnValue(mockPolicy);

      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: 'Bearer testtoken',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect(result.principalId).toBe(principalId);
    });

    it('should include context with user ID', async () => {
      // Arrange
      const principalId = 'user-mytoken';
      const context = { userId: principalId, tokenSource: 'header' };
      const mockPolicy = {
        principalId,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: expectedBaseResource + '/*',
            },
          ],
        },
        context,
      };

      mockValidateToken.mockReturnValue({
        isValid: true,
        principalId,
        context,
      });
      mockBuildPolicy.mockReturnValue(mockPolicy);

      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: 'Bearer mytoken123456',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect(result.context).toBeDefined();
      expect(result.context?.userId).toContain('user-');
      expect(result.context?.tokenSource).toBe('header');
    });
  });

  describe('Invalid Authorization', () => {
    it('should deny requests with missing authorization token', async () => {
      // Arrange
      const mockDenyPolicy = {
        principalId: 'user',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Deny',
              Resource: mockMethodArn + '/*',
            },
          ],
        },
      };

      mockValidateToken.mockReturnValue({
        isValid: false,
        error: 'No authorization token provided',
      });
      mockBuildPolicy.mockReturnValue(mockDenyPolicy);

      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: '',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('should deny requests without Bearer prefix', async () => {
      // Arrange
      const mockDenyPolicy = {
        principalId: 'user',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Deny',
              Resource: mockMethodArn + '/*',
            },
          ],
        },
      };

      mockValidateToken.mockReturnValue({
        isValid: false,
        error: 'Invalid token format',
      });
      mockBuildPolicy.mockReturnValue(mockDenyPolicy);

      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: 'InvalidToken',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('should deny requests with Bearer but no token value', async () => {
      // Arrange
      const mockDenyPolicy = {
        principalId: 'user',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Deny',
              Resource: mockMethodArn + '/*',
            },
          ],
        },
      };

      mockValidateToken.mockReturnValue({
        isValid: false,
        error: 'Empty token value',
      });
      mockBuildPolicy.mockReturnValue(mockDenyPolicy);

      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: 'Bearer ',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('should deny requests with Bearer and only whitespace', async () => {
      // Arrange
      const mockDenyPolicy = {
        principalId: 'user',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Deny',
              Resource: mockMethodArn + '/*',
            },
          ],
        },
      };

      mockValidateToken.mockReturnValue({
        isValid: false,
        error: 'Empty token value',
      });
      mockBuildPolicy.mockReturnValue(mockDenyPolicy);

      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: 'Bearer   ',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });
  });

  describe('Authorization Policy Structure', () => {
    it('should return proper IAM policy structure', async () => {
      // Arrange
      const principalId = 'user-valid';
      const context = { userId: principalId, tokenSource: 'header' };
      const mockPolicy = {
        principalId,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: expectedBaseResource + '/*',
            },
          ],
        },
        context,
      };

      mockValidateToken.mockReturnValue({
        isValid: true,
        principalId,
        context,
      });
      mockBuildPolicy.mockReturnValue(mockPolicy);

      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: 'Bearer valid-token',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect(result.policyDocument).toBeDefined();
      expect(result.policyDocument.Version).toBe('2012-10-17');
      expect(Array.isArray(result.policyDocument.Statement)).toBe(true);
      expect(result.policyDocument.Statement.length).toBe(1);
      expect((result.policyDocument.Statement[0] as any).Action).toBe('execute-api:Invoke');
    });

    it('should use wildcard resource to allow all methods', async () => {
      // Arrange
      const principalId = 'user-valid';
      const context = { userId: principalId, tokenSource: 'header' };
      const mockPolicy = {
        principalId,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: expectedBaseResource + '/*',
            },
          ],
        },
        context,
      };

      mockValidateToken.mockReturnValue({
        isValid: true,
        principalId,
        context,
      });
      mockBuildPolicy.mockReturnValue(mockPolicy);

      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: 'Bearer valid-token',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect((result.policyDocument.Statement[0] as any).Resource).toBe(expectedBaseResource + '/*');
      expect((result.policyDocument.Statement[0] as any).Resource).toContain('/*');
    });

    it('should extract base resource from method ARN', async () => {
      // Arrange
      const principalId = 'user-valid';
      const context = { userId: principalId, tokenSource: 'header' };
      const expectedResource = 'arn:aws:execute-api:us-west-2:999999999999:xyz123/prod';
      const mockPolicy = {
        principalId,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: expectedResource + '/*',
            },
          ],
        },
        context,
      };

      mockValidateToken.mockReturnValue({
        isValid: true,
        principalId,
        context,
      });
      mockBuildPolicy.mockReturnValue(mockPolicy);

      const event: any = {
        type: 'TOKEN',
        methodArn: 'arn:aws:execute-api:us-west-2:999999999999:xyz123/prod/POST/tasks/123',
        authorizationToken: 'Bearer valid-token',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect((result.policyDocument.Statement[0] as any).Resource).toBe(expectedResource + '/*');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long tokens', async () => {
      // Arrange
      const principalId = 'user-xxxx';
      const context = { userId: principalId, tokenSource: 'header' };
      const mockPolicy = {
        principalId,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: expectedBaseResource + '/*',
            },
          ],
        },
        context,
      };

      mockValidateToken.mockReturnValue({
        isValid: true,
        principalId,
        context,
      });
      mockBuildPolicy.mockReturnValue(mockPolicy);

      const longToken = 'Bearer ' + 'x'.repeat(1000);
      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: longToken,
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should handle special characters in token', async () => {
      // Arrange
      const principalId = 'user-token';
      const context = { userId: principalId, tokenSource: 'header' };
      const mockPolicy = {
        principalId,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: expectedBaseResource + '/*',
            },
          ],
        },
        context,
      };

      mockValidateToken.mockReturnValue({
        isValid: true,
        principalId,
        context,
      });
      mockBuildPolicy.mockReturnValue(mockPolicy);

      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: 'Bearer token-with.special_chars+123',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
      expect(result.principalId).toBeDefined();
    });
  });
});
