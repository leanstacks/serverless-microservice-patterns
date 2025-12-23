import { z } from 'zod';

/**
 * Schema for validating the SQS message attributes
 */
export const sqsMessageAttributeSchema = z.object({
  event: z.string('event attribute must be a string').min(1, 'event attribute is required'),
});

/**
 * Type for the validated SQS message attributes
 */
export type SqsMessageAttributes = z.infer<typeof sqsMessageAttributeSchema>;

/**
 * Schema for validating the full SQS message event
 */
export const sendNotificationEventSchema = z.object({
  Records: z.array(
    z.object({
      messageId: z.string(),
      receiptHandle: z.string(),
      messageAttributes: z.object({
        event: z.object({
          stringValue: z.string(),
        }),
      }),
      body: z.string(),
    }),
  ),
});

/**
 * Type for the validated send notification event
 */
export type SendNotificationEvent = z.infer<typeof sendNotificationEventSchema>;
