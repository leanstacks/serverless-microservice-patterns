import { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { z } from 'zod';

import { CreateTaskMessage, CreateTaskMessageSchema } from '../../models/create-task-message.js';
import { createTask, deleteTask } from '../../services/task-service.js';
import { logger, withRequestTracking } from '../../utils/logger.js';
import { incrementTaskFileProcessedCount } from '../../services/task-file-service.js';

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
 * Lambda handler for processing SQS messages from the Create Task Queue.
 * Uses batch item failures to only retry failed messages.
 *
 * @param event - SQS event containing create task messages
 * @param context - Lambda execution context
 * @returns SQS batch response with failed message IDs
 */
export const handler = async (event: SQSEvent, context: Context): Promise<SQSBatchResponse> => {
  withRequestTracking(event, context);
  logger.info({ recordCount: event.Records?.length }, '[CreateTaskSubscriber] > handler');
  logger.debug({ event, context }, '[CreateTaskSubscriber] - event');

  const batchItemFailures: SQSBatchItemFailure[] = [];

  try {
    // Validate the SQS event structure
    const validationResult = sqsEventSchema.safeParse(event);
    if (!validationResult.success) {
      logger.error({ error: validationResult.error }, '[CreateTaskSubscriber] < handler - invalid SQS event structure');
      // Return all messages as failures if event structure is invalid
      return {
        batchItemFailures: event.Records?.map((record) => ({ itemIdentifier: record.messageId })) ?? [],
      };
    }

    // Process each message in parallel using Promise.allSettled
    const results = await Promise.allSettled(
      event.Records.map(async (record) => {
        try {
          logger.debug({ messageId: record.messageId }, '[CreateTaskSubscriber] processing message');

          // Parse and validate the message body
          let createTaskMessage: CreateTaskMessage;
          try {
            const parsedBody = JSON.parse(record.body);
            createTaskMessage = CreateTaskMessageSchema.parse(parsedBody);
          } catch (error) {
            logger.error(
              { messageId: record.messageId, error: String(error), body: record.body },
              '[CreateTaskSubscriber] failed to parse or validate message body',
            );
            throw new Error(`Invalid message body for messageId: ${record.messageId}`);
          }

          // Create the task
          const task = await createTask(createTaskMessage.task);

          // Increment the processed count for the associated TaskFile
          try {
            await incrementTaskFileProcessedCount(createTaskMessage.taskFileId);
          } catch (error) {
            // Failed to update TaskFile processed count; delete the created task for idempotency
            await deleteTask(task.id);
            logger.error(
              { messageId: record.messageId, error: String(error), taskFileId: createTaskMessage.taskFileId },
              '[CreateTaskSubscriber] failed to increment processed count for TaskFile',
            );
            throw error;
          }

          // Successfully processed the message
          return { messageId: record.messageId, success: true };
        } catch (error) {
          logger.error(
            { messageId: record.messageId, error: String(error) },
            '[CreateTaskSubscriber] failed to process message',
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
          logger.warn({ messageId }, '[CreateTaskSubscriber] adding message to batch item failures');
        }
      }
    });

    logger.info(
      {
        totalRecords: event.Records.length,
        successCount: results.filter((r) => r.status === 'fulfilled').length,
        failureCount: batchItemFailures.length,
      },
      '[CreateTaskSubscriber] < handler - completed processing',
    );
    // Return the batch item failures for SQS to retry
    return { batchItemFailures };
  } catch (error) {
    logger.error({ error }, '[CreateTaskSubscriber] < handler - unexpected error during processing');
    // Return all messages as failures if an unexpected error occurs
    return {
      batchItemFailures: event.Records?.map((record) => ({ itemIdentifier: record.messageId })) ?? [],
    };
  }
};
