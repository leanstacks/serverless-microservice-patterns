import { z } from 'zod';

/**
 * Schema for validating environment variables
 */
const envSchema = z.object({
  // Required variables
  TASKS_TABLE: z.string().min(1, 'TASKS_TABLE environment variable is required'),

  // Optional variables with defaults
  AWS_REGION: z.string().default('us-east-1'),

  // Logging configuration
  LOGGING_ENABLED: z
    .enum(['true', 'false'] as const)
    .default('true')
    .transform((val) => val === 'true'),
  LOGGING_LEVEL: z.enum(['debug', 'info', 'warn', 'error'] as const).default('debug'),
  LOGGING_FORMAT: z.enum(['text', 'json'] as const).default('json'),

  // CORS configuration
  CORS_ALLOW_ORIGIN: z.string().default('*'),

  // Add more environment variables as needed
});

/**
 * Type representing our validated config
 */
export type Config = z.infer<typeof envSchema>;

// Cache for the validated config
let configCache: Config | null = null;

/**
 * Validates environment variables against schema and returns a validated config object
 * @throws {Error} if validation fails
 */
const _validateConfig = (): Config => {
  try {
    // Parse and validate environment variables
    return envSchema.parse(process.env);
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');

      throw new Error(`Configuration validation failed:\n${errorMessage}`);
    }

    // Re-throw other errors
    throw error;
  }
};

/**
 * Refreshes the configuration by re-validating environment variables
 * Useful in tests when environment variables are changed
 */
export const refreshConfig = (): Config => {
  configCache = _validateConfig();
  return configCache;
};

/**
 * Validated configuration object
 * Access environment variables through this object instead of process.env directly
 */
export const config = configCache || refreshConfig();
