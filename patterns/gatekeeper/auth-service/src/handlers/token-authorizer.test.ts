// Mock logger before importing handler
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('../utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('pino-lambda', () => ({
  lambdaRequestTracker: () => jest.fn(),
}));

describe('Authorize Handler', () => {
  let handler: typeof import('./token-authorizer').handler;

  beforeEach(() => {
    jest.clearAllMocks();
    // Import handler after mocks are set up
    handler = require('./token-authorizer').handler;
  });

  const mockMethodArn = 'arn:aws:execute-api:us-east-1:123456789012:abcdef/dev/GET/tasks';
  const expectedBaseResource = 'arn:aws:execute-api:us-east-1:123456789012:abcdef/dev';

  describe('Valid Authorization', () => {
    it('should allow requests with valid Bearer token', async () => {
      // Arrange
      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: 'Bearer valid-test-token-12345',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect(result.principalId).toContain('user-');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
      expect(result.policyDocument.Statement[0].Resource).toBe(expectedBaseResource + '/*');
      expect(result.context?.userId).toBeDefined();
      expect(result.context?.tokenSource).toBe('header');
    });

    it('should extract principal ID from token', async () => {
      // Arrange
      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: 'Bearer testtoken',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      expect(result.principalId).toBe('user-testtoke');
    });

    it('should include context with user ID', async () => {
      // Arrange
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
      expect(result.policyDocument.Statement[0].Action).toBe('execute-api:Invoke');
    });

    it('should use wildcard resource to allow all methods', async () => {
      // Arrange
      const event: any = {
        type: 'TOKEN',
        methodArn: mockMethodArn,
        authorizationToken: 'Bearer valid-token',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      // With the new implementation, resource is base ARN + /* to allow all methods/paths in the stage
      expect(result.policyDocument.Statement[0].Resource).toBe(expectedBaseResource + '/*');
      expect(result.policyDocument.Statement[0].Resource).toContain('/*');
    });

    it('should extract base resource from method ARN', async () => {
      // Arrange
      const event: any = {
        type: 'TOKEN',
        methodArn: 'arn:aws:execute-api:us-west-2:999999999999:xyz123/prod/POST/tasks/123',
        authorizationToken: 'Bearer valid-token',
      };

      // Act
      const result = (await handler(event, undefined as any, undefined as any)) as any;

      // Assert
      // Base resource should be first two parts of the ARN + /*
      expect(result.policyDocument.Statement[0].Resource).toBe(
        'arn:aws:execute-api:us-west-2:999999999999:xyz123/prod/*',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long tokens', async () => {
      // Arrange
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
