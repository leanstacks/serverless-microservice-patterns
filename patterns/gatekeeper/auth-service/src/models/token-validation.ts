/**
 * Token validation result interface
 */
export interface TokenValidationResult {
  isValid: boolean;
  principalId?: string;
  context?: Record<string, string>;
  error?: string;
}
