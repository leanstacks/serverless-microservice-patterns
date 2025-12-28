// Mock logger before importing service
const mockLoggerDebug = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: mockLoggerDebug,
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

import { validateToken, buildPolicy } from './token-authorizer-service';

describe('TokenAuthorizerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateToken', () => {
    describe('Valid Tokens', () => {
      it('should validate token with valid Bearer format', () => {
        // Arrange
        const token = 'Bearer valid-test-token-12345';

        // Act
        const result = validateToken(token);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.principalId).toBe('user-valid-te');
        expect(result.context).toBeDefined();
        expect(result.context?.userId).toBe('user-valid-te');
        expect(result.context?.tokenSource).toBe('header');
        expect(result.error).toBeUndefined();
      });

      it('should extract correct principal ID from token', () => {
        // Arrange
        const token = 'Bearer testtoken';

        // Act
        const result = validateToken(token);

        // Assert
        expect(result.principalId).toBe('user-testtoke');
      });

      it('should handle long tokens', () => {
        // Arrange
        const token = 'Bearer ' + 'x'.repeat(1000);

        // Act
        const result = validateToken(token);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.principalId).toBe('user-xxxxxxxx');
      });

      it('should handle tokens with special characters', () => {
        // Arrange
        const token = 'Bearer token-with.special_chars+123';

        // Act
        const result = validateToken(token);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.principalId).toBeDefined();
        expect(result.context).toBeDefined();
      });
    });

    describe('Invalid Tokens', () => {
      it('should reject empty token', () => {
        // Arrange
        const token = '';

        // Act
        const result = validateToken(token);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid token format');
        expect(result.principalId).toBeUndefined();
        expect(result.context).toBeUndefined();
      });

      it('should reject token without Bearer prefix', () => {
        // Arrange
        const token = 'InvalidToken';

        // Act
        const result = validateToken(token);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid token format');
      });

      it('should reject token with only Bearer prefix', () => {
        // Arrange
        const token = 'Bearer ';

        // Act
        const result = validateToken(token);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Empty token value');
      });

      it('should reject token with Bearer and only whitespace', () => {
        // Arrange
        const token = 'Bearer   ';

        // Act
        const result = validateToken(token);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Empty token value');
      });
    });

    describe('Logging', () => {
      it('should log info message on token validation attempt', () => {
        // Arrange
        const token = 'Bearer test-token';

        // Act
        validateToken(token);

        // Assert
        expect(mockLoggerInfo).toHaveBeenCalledWith('[TokenAuthorizerService] > validateToken');
      });

      it('should log warning on invalid token format', () => {
        // Arrange
        const token = 'InvalidToken';

        // Act
        validateToken(token);

        // Assert
        expect(mockLoggerWarn).toHaveBeenCalledWith('[TokenAuthorizerService] - validateToken - Invalid token format');
      });

      it('should log warning on empty token value', () => {
        // Arrange
        const token = 'Bearer ';

        // Act
        validateToken(token);

        // Assert
        expect(mockLoggerWarn).toHaveBeenCalledWith('[TokenAuthorizerService] - validateToken - Empty token value');
      });

      it('should log info on successful validation', () => {
        // Arrange
        const token = 'Bearer valid-token';

        // Act
        validateToken(token);

        // Assert
        expect(mockLoggerInfo).toHaveBeenCalledWith(
          { principalId: 'user-valid-to' },
          '[TokenAuthorizerService] < validateToken - Token validated successfully',
        );
      });
    });
  });

  describe('buildPolicy', () => {
    it('should build allow policy with context', () => {
      // Arrange
      const principalId = 'user-12345678';
      const resource = 'arn:aws:execute-api:us-east-1:123456789012:abcdef/dev';
      const context = { userId: 'user-12345678', tokenSource: 'header' };

      // Act
      const policy = buildPolicy(principalId, 'Allow', resource, context);

      // Assert
      expect(policy.principalId).toBe(principalId);
      expect(policy.policyDocument).toBeDefined();
      expect(policy.policyDocument.Version).toBe('2012-10-17');
      expect(policy.policyDocument.Statement).toHaveLength(1);
      expect((policy.policyDocument.Statement[0] as any).Action).toBe('execute-api:Invoke');
      expect((policy.policyDocument.Statement[0] as any).Effect).toBe('Allow');
      expect((policy.policyDocument.Statement[0] as any).Resource).toBe(resource + '/*');
      expect(policy.context).toEqual(context);
    });

    it('should build deny policy without context', () => {
      // Arrange
      const principalId = 'user-denied';
      const resource = 'arn:aws:execute-api:us-east-1:123456789012:abcdef/dev';

      // Act
      const policy = buildPolicy(principalId, 'Deny', resource);

      // Assert
      expect(policy.principalId).toBe(principalId);
      expect((policy.policyDocument.Statement[0] as any).Effect).toBe('Deny');
      expect(policy.context).toBeUndefined();
    });

    it('should append /* to resource', () => {
      // Arrange
      const resource = 'arn:aws:execute-api:us-west-2:999999999999:xyz123/prod';

      // Act
      const policy = buildPolicy('user-123', 'Allow', resource);

      // Assert
      expect((policy.policyDocument.Statement[0] as any).Resource).toBe(resource + '/*');
    });

    it('should handle resource with different stages', () => {
      // Arrange
      const devResource = 'arn:aws:execute-api:us-east-1:123456789012:api-id/dev';
      const prodResource = 'arn:aws:execute-api:us-east-1:123456789012:api-id/prod';

      // Act
      const devPolicy = buildPolicy('user-dev', 'Allow', devResource);
      const prodPolicy = buildPolicy('user-prod', 'Allow', prodResource);

      // Assert
      expect((devPolicy.policyDocument.Statement[0] as any).Resource).toBe(devResource + '/*');
      expect((prodPolicy.policyDocument.Statement[0] as any).Resource).toBe(prodResource + '/*');
    });

    describe('Logging', () => {
      it('should log info on policy building start', () => {
        // Arrange
        const principalId = 'user-123';
        const resource = 'arn:aws:execute-api:us-east-1:123456789012:abc/stage';

        // Act
        buildPolicy(principalId, 'Allow', resource);

        // Assert
        expect(mockLoggerInfo).toHaveBeenCalledWith('[TokenAuthorizerService] > buildPolicy');
      });

      it('should log debug message with policy input parameters', () => {
        // Arrange
        const principalId = 'user-123';
        const resource = 'arn:aws:execute-api:us-east-1:123456789012:abc/stage';
        const context = { userId: 'user-123', tokenSource: 'header' };

        // Act
        buildPolicy(principalId, 'Allow', resource, context);

        // Assert
        expect(mockLoggerDebug).toHaveBeenCalledWith(
          { principalId, effect: 'Allow', resource, context },
          '[TokenAuthorizerService] - buildPolicy - Input parameters',
        );
      });

      it('should log debug message with constructed policy result', () => {
        // Arrange
        const principalId = 'user-123';
        const resource = 'arn:aws:execute-api:us-east-1:123456789012:abc/stage';

        // Act
        buildPolicy(principalId, 'Allow', resource);

        // Assert
        expect(mockLoggerDebug).toHaveBeenCalledWith(
          expect.objectContaining({ authResult: expect.any(Object) }),
          '[TokenAuthorizerService] - buildPolicy - Authorization result constructed',
        );
      });

      it('should log info on policy building completion', () => {
        // Arrange
        const principalId = 'user-123';
        const resource = 'arn:aws:execute-api:us-east-1:123456789012:abc/stage';

        // Act
        buildPolicy(principalId, 'Allow', resource);

        // Assert
        expect(mockLoggerInfo).toHaveBeenCalledWith('[TokenAuthorizerService] < buildPolicy');
      });
    });
  });
});
