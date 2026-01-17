/**
 * @module models/sqs-event
 * @description Zod schema for validating SQS event structure.
 */

import { z } from 'zod';

/**
 * Schema for validating SQS event structure.
 */
export const SqsEventSchema = z.object({
  Records: z
    .array(
      z.object({
        messageId: z.string(),
        body: z.string(),
      }),
    )
    .min(1, 'At least one SQS record is required'),
});
