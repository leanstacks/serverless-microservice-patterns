/**
 * @module handlers/sqs/complete-task-file-subscriber
 * @description Lambda handler for processing SQS messages from the TaskFile Complete Queue.
 */

import { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda';

import { SqsEventSchema } from '@/models/sqs-event.js';
import { logger, withRequestTracking } from '@/utils/logger.js';
import { updateTaskFileStatus } from '@/services/task-file-service.js';
import { ProcessingStatus } from '@/models/task-file.js';
import { CompleteTaskFileMessage, CompleteTaskFileMessageSchema } from '@/models/complete-task-file-message.js';

/**
 * Lambda handler for processing SQS messages from the TaskFile Complete Queue.
 * Updates the TaskFile status to COMPLETED for each message received.
 * Uses batch item failures to only retry failed messages.
 *
 * @param event - SQS event containing task file completion messages from SNS
 * @param context - Lambda execution context
 * @returns SQS batch response with failed message IDs
 */
export const handler = async (event: SQSEvent, context: Context): Promise<SQSBatchResponse> => {
  withRequestTracking(event, context);
  logger.info({ recordCount: event.Records?.length }, '[CompleteTaskFileSubscriber] > handler');
  logger.debug({ event, context }, '[CompleteTaskFileSubscriber] - event');

  const batchItemFailures: SQSBatchItemFailure[] = [];

  try {
    // Validate the SQS event structure
    const validationResult = SqsEventSchema.safeParse(event);
    if (!validationResult.success) {
      logger.error(
        { error: validationResult.error },
        '[CompleteTaskFileSubscriber] < handler - invalid SQS event structure',
      );
      // Return all messages as failures if event structure is invalid
      return {
        batchItemFailures: event.Records?.map((record) => ({ itemIdentifier: record.messageId })) ?? [],
      };
    }

    // Process each message in parallel using Promise.allSettled
    const results = await Promise.allSettled(
      event.Records.map(async (record) => {
        try {
          logger.debug({ messageId: record.messageId }, '[CompleteTaskFileSubscriber] processing message');

          // Parse and validate the message body
          let message: CompleteTaskFileMessage;
          try {
            const parsedBody = JSON.parse(record.body);
            message = CompleteTaskFileMessageSchema.parse(parsedBody);
          } catch (error) {
            logger.error(
              { messageId: record.messageId, error: String(error), body: record.body },
              '[CompleteTaskFileSubscriber] failed to parse or validate message body',
            );
            throw new Error(`Invalid message body for messageId: ${record.messageId}`);
          }

          // Update the TaskFile status to COMPLETED
          const taskFileId = message.taskFile.id;
          await updateTaskFileStatus(taskFileId, ProcessingStatus.COMPLETED);

          logger.debug(
            { messageId: record.messageId, taskFileId },
            '[CompleteTaskFileSubscriber] successfully updated task file status to COMPLETED',
          );

          // Successfully processed the message
          return { messageId: record.messageId, success: true };
        } catch (error) {
          logger.error(
            { messageId: record.messageId, error: String(error) },
            '[CompleteTaskFileSubscriber] failed to process message',
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
          logger.warn({ messageId }, '[CompleteTaskFileSubscriber] adding message to batch item failures');
        }
      }
    });

    logger.info(
      {
        totalRecords: event.Records.length,
        successCount: results.filter((r) => r.status === 'fulfilled').length,
        failureCount: batchItemFailures.length,
      },
      '[CompleteTaskFileSubscriber] < handler - completed processing',
    );

    // Return the batch item failures for SQS to retry
    return { batchItemFailures };
  } catch (error) {
    logger.error({ error }, '[CompleteTaskFileSubscriber] < handler - unexpected error during processing');
    // Return all messages as failures if an unexpected error occurs
    return {
      batchItemFailures: event.Records?.map((record) => ({ itemIdentifier: record.messageId })) ?? [],
    };
  }
};
