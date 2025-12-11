import 'dotenv/config';
import { z } from 'zod';

/**
 * Zod schema for CDK configuration validation.
 */
const configSchema = z.object({
  CDK_APP_NAME: z.string().default('smp-gatekeeper-task-service'),
  CDK_ENV: z.enum(['dev', 'qat', 'prd'], 'CDK_ENV must be one of: dev, qat, prd'),
  CDK_ACCOUNT: z.string().optional(),
  CDK_REGION: z.string().optional(),
  CDK_OU: z.string().optional(),
  CDK_OWNER: z.string().optional(),
  CDK_CORS_ALLOW_ORIGIN: z.string().default('*'),
  CDK_APP_LOGGING_ENABLED: z
    .enum(['true', 'false'] as const)
    .default('true')
    .transform((val) => val === 'true'),
  CDK_APP_LOGGING_LEVEL: z.enum(['debug', 'info', 'warn', 'error'] as const).default('info'),
  CDK_APP_LOGGING_FORMAT: z.enum(['text', 'json'] as const).default('json'),
});

/**
 * Type for validated CDK configuration.
 */
export type Config = z.infer<typeof configSchema>;

/**
 * Parse and validate CDK configuration from environment variables.
 * @returns Validated configuration object.
 * @throws {Error} If required configuration is missing or invalid.
 */
export function getConfig(): Config {
  try {
    const config = configSchema.parse(process.env);

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`CDK configuration validation failed: ${messages}`);
    }
    throw error;
  }
}

/**
 * Get resource tags based on configuration.
 * @param config The validated configuration.
 * @returns Object containing standard resource tags.
 */
export function getTags(config: Config): Record<string, string> {
  return {
    App: config.CDK_APP_NAME,
    Env: config.CDK_ENV,
    OU: config.CDK_OU || 'leanstacks',
    Owner: config.CDK_OWNER || 'unknown',
  };
}

/**
 * Get AWS environment configuration for CDK stacks.
 * Uses CDK_ACCOUNT and CDK_REGION if provided, otherwise falls back to
 * CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION which are automatically
 * set by the CDK CLI based on the current AWS credentials and profile.
 * @param config The validated configuration.
 * @returns Environment config object with account and region, or undefined if neither are set.
 */
export function getEnvironmentConfig(config: Config): { account: string; region: string } | undefined {
  const account = config.CDK_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;
  const region = config.CDK_REGION || process.env.CDK_DEFAULT_REGION;

  if (account && region) {
    return { account, region };
  }

  return undefined;
}
