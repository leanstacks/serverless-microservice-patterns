import { z } from 'zod';

/**
 * Schema for validating the Lambda event payload
 */
export const sendNotificationEventSchema = z.object({
  action: z.string('action must be a string').min(1, 'action is required'),
  payload: z.record(z.string(), z.any()).optional(),
});

/**
 * Type for the validated send notification event
 */
export type SendNotificationEvent = z.infer<typeof sendNotificationEventSchema>;
