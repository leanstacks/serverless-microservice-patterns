/**
 * @module models/complete-task-file-message
 * @description Zod schema and TypeScript type for validating and representing
 * the message body sent to the TaskFile Complete SQS queue.
 */

import { z } from 'zod';

/**
 * Schema for validating the SNS message body containing TaskFile data.
 */
export const CompleteTaskFileMessageSchema = z.object({
  taskFile: z.object({
    id: z.string(),
  }),
});

/**
 * Type representing the validated complete task file message body
 */
export type CompleteTaskFileMessage = z.infer<typeof CompleteTaskFileMessageSchema>;
