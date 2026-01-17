import { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent, S3EventRecord } from 'aws-lambda';
import { z } from 'zod';

import { parseCsvAndCreateTasks } from '../../services/task-file-service.js';
import { logger, withRequestTracking } from '../../utils/logger.js';
import { getObjectContent } from '../../utils/s3-client.js';

/**
 * Schema for validating SQS event structure.
 */
const sqsEventSchema = z.object({
  Records: z
    .array(
      z.object({
        messageId: z.string(),
        body: z.string(),
      }),
    )
    .min(1, 'At least one SQS record is required'),
});

/**
 * Lambda handler for processing SQS messages from the Task Upload Queue.
 * Each message contains an S3 event notification for a newly uploaded CSV file.
 * Uses batch item failures to only retry failed messages.
 *
 * @param event - SQS event containing S3 event notifications
 * @param context - Lambda execution context
 * @returns SQS batch response with failed message IDs
 */
export const handler = async (event: SQSEvent, context: Context): Promise<SQSBatchResponse> => {
  withRequestTracking(event, context);
  logger.info({ recordCount: event.Records?.length }, '[UploadTaskSubscriber] > handler');
  logger.debug({ event, context }, '[UploadTaskSubscriber] - event');

  const batchItemFailures: SQSBatchItemFailure[] = [];

  try {
    // Validate the SQS event structure
    const validationResult = sqsEventSchema.safeParse(event);
    if (!validationResult.success) {
      logger.error({ error: validationResult.error }, '[UploadTaskSubscriber] < handler - invalid SQS event structure');
      // Return all messages as failures if event structure is invalid
      return {
        batchItemFailures: event.Records?.map((record) => ({ itemIdentifier: record.messageId })) ?? [],
      };
    }

    // Process each message in parallel using Promise.allSettled
    const results = await Promise.allSettled(
      event.Records.map(async (record) => {
        try {
          logger.debug({ messageId: record.messageId }, '[UploadTaskSubscriber] processing message');

          // Parse the S3 event from the message body. There will be only one record per message.
          let s3Event: S3EventRecord;
          try {
            const parsedBody = JSON.parse(record.body);
            // Ignore "s3:TestEvent" notifications
            if (parsedBody.Event === 's3:TestEvent') {
              logger.debug({ messageId: record.messageId }, '[UploadTaskSubscriber] skipping TestEvent notification');
              return { messageId: record.messageId, success: true };
            }

            // Extract the S3 event from the SQS message (it's wrapped in Records array)
            if (parsedBody.Records && parsedBody.Records[0]) {
              s3Event = parsedBody.Records[0];
            } else {
              throw new Error('Invalid S3 event structure');
            }
          } catch (error) {
            logger.error(
              {
                messageId: record.messageId,
                error: String(error),
                body: record.body,
              },
              '[UploadTaskSubscriber] failed to parse S3 event',
            );
            throw new Error('Invalid S3 event');
          }

          // Extract bucket name and object key from the S3 event
          const bucketName = s3Event.s3.bucket.name;
          const objectKey = s3Event.s3.object.key;

          logger.debug(
            { messageId: record.messageId, bucketName, objectKey },
            '[UploadTaskSubscriber] retrieved S3 event details',
          );

          // Fetch the CSV file from S3
          const csvContent = await getObjectContent(bucketName, objectKey);

          logger.debug(
            { messageId: record.messageId, contentLength: csvContent.length },
            '[UploadTaskSubscriber] retrieved CSV from S3',
          );

          // Parse the CSV and fan out create tasks
          await parseCsvAndCreateTasks(csvContent, objectKey);

          logger.debug(
            { messageId: record.messageId, bucketName, objectKey },
            '[UploadTaskSubscriber] successfully processed CSV and fanned out create tasks',
          );

          return { messageId: record.messageId, success: true };
        } catch (error) {
          logger.error(
            { messageId: record.messageId, error: String(error) },
            '[UploadTaskSubscriber] failed to process message',
          );
          throw error;
        }
      }),
    );

    // Collect failed message IDs
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const messageId = event.Records?.[index]?.messageId;
        if (messageId) {
          batchItemFailures.push({ itemIdentifier: messageId });
          logger.warn({ messageId }, '[UploadTaskSubscriber] adding message to batch item failures');
        }
      }
    });

    logger.info(
      {
        totalRecords: event.Records.length,
        successCount: results.filter((r) => r.status === 'fulfilled').length,
        failureCount: batchItemFailures.length,
      },
      '[UploadTaskSubscriber] < handler - completed processing',
    );
    // Return the batch item failures for SQS to retry
    return { batchItemFailures };
  } catch (error) {
    logger.error({ error: String(error) }, '[UploadTaskSubscriber] < handler - unexpected error during processing');
    // Return all messages as failures if an unexpected error occurs
    return {
      batchItemFailures: event.Records?.map((record) => ({ itemIdentifier: record.messageId })) ?? [],
    };
  }
};
