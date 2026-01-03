import { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { z } from 'zod';

import { CreateTaskDtoSchema } from '../models/create-task-dto.js';
import { createTask } from '../services/task-service.js';
import { logger, withRequestTracking } from '../utils/logger.js';

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
          logger.info({ messageId: record.messageId }, '[CreateTaskSubscriber] processing message');

          // Parse and validate the message body
          let createTaskDto;
          try {
            const parsedBody = JSON.parse(record.body);
            createTaskDto = CreateTaskDtoSchema.parse(parsedBody);
          } catch (error) {
            logger.error(
              { messageId: record.messageId, error, body: record.body },
              '[CreateTaskSubscriber] failed to parse or validate message body',
            );
            throw new Error('Invalid message body');
          }

          // Create the task
          const task = await createTask(createTaskDto);
          logger.info(
            { messageId: record.messageId, taskId: task.id },
            '[CreateTaskSubscriber] successfully created task',
          );

          return { messageId: record.messageId, success: true };
        } catch (error) {
          logger.error({ messageId: record.messageId, error }, '[CreateTaskSubscriber] failed to process message');
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

    return { batchItemFailures };
  } catch (error) {
    logger.error({ error }, '[CreateTaskSubscriber] < handler - unexpected error during processing');
    // Return all messages as failures if an unexpected error occurs
    return {
      batchItemFailures: event.Records?.map((record) => ({ itemIdentifier: record.messageId })) ?? [],
    };
  }
};
