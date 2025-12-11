import { TokenValidationResult } from './token-validation';

describe('TokenValidationResult', () => {
  it('should have required properties for valid token', () => {
    // Arrange
    const result: TokenValidationResult = {
      isValid: true,
      principalId: 'user-12345678',
      context: {
        userId: 'user-12345678',
        tokenSource: 'header',
      },
    };

    // Act & Assert
    expect(result.isValid).toBe(true);
    expect(result.principalId).toBeDefined();
    expect(result.context).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('should have required properties for invalid token', () => {
    // Arrange
    const result: TokenValidationResult = {
      isValid: false,
      error: 'Invalid token format',
    };

    // Act & Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.principalId).toBeUndefined();
    expect(result.context).toBeUndefined();
  });
});
