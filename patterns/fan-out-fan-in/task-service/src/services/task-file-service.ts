/**
 * @module TaskFileService
 * @description Service for managing TaskFile records in DynamoDB and processing CSV uploads.
 */

import { randomUUID } from 'crypto';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';
import { SNSEventName } from '@/utils/constants.js';
import { CreateTaskFileDto } from '../models/create-task-file-dto.js';
import { ProcessingStatus, TaskFile, TaskFileItem, TaskFileKeys, toTaskFile } from '../models/task-file.js';
import { parseCsv } from './csv-service.js';
import { fanOutCreateTasks } from './task-service.js';
import { dynamoDocClient } from '../utils/dynamodb-client.js';
import { publishToTopic } from '../utils/sns-client.js';

/**
 * Creates a new TaskFile item in DynamoDB to track the processing state of an uploaded CSV file
 * @param createTaskFileDto - The data for the new task file (recordCount and fileName)
 * @returns Promise that resolves to the created TaskFile object
 * @throws Error if the DynamoDB put operation fails
 */
export const createTaskFile = async (createTaskFileDto: CreateTaskFileDto): Promise<TaskFile> => {
  logger.info('[TaskFileService] > createTaskFile');

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const taskFileItem: TaskFileItem = {
      pk: TaskFileKeys.pk(id),
      sk: TaskFileKeys.sk(),
      id,
      fileName: createTaskFileDto.fileName,
      processingStatus: ProcessingStatus.NEW,
      recordCount: createTaskFileDto.recordCount,
      processedCount: 0,
      unprocessedCount: createTaskFileDto.recordCount,
      createdAt: now,
      updatedAt: now,
    };

    const command = new PutCommand({
      TableName: config.TASK_FILE_TABLE,
      Item: taskFileItem,
    });
    logger.debug({ input: command.input }, '[TaskFileService] createTaskFile - PutCommandInput');

    await dynamoDocClient.send(command);

    const taskFile = toTaskFile(taskFileItem);

    logger.info({ id: taskFile.id }, '[TaskFileService] < createTaskFile - successfully created task file');
    return taskFile;
  } catch (error) {
    logger.error(
      { error: String(error) },
      '[TaskFileService] < createTaskFile - failed to create task file in DynamoDB',
    );
    throw error;
  }
};

/**
 * Parses CSV content and fans out create tasks by publishing to SQS queue
 * Creates a TaskFile record before fanning out tasks to track processing state
 * @param csvContent - The CSV file content as a string
 * @returns Promise that resolves to the ID of the created TaskFile
 * @throws Error if CSV parsing, task file creation, or message publishing fails
 */
export const parseCsvAndCreateTasks = async (csvContent: string, fileName: string): Promise<string> => {
  logger.info('[TaskFileService] > parseCsvAndCreateTasks');

  try {
    // Parse CSV content into CreateTaskDto objects
    const tasks = parseCsv(csvContent);

    logger.debug({ taskCount: tasks.length }, '[TaskFileService] parseCsvAndCreateTasks - parsed CSV');

    // Create TaskFile record before fanning out tasks
    // This ensures the TaskFile exists in DynamoDB before any fanned out tasks are processed
    const taskFile = await createTaskFile({
      recordCount: tasks.length,
      fileName,
    });

    logger.debug(
      { taskFileId: taskFile.id, taskCount: tasks.length },
      '[TaskFileService] parseCsvAndCreateTasks - created task file',
    );

    // Fan out create tasks to SQS queue
    await fanOutCreateTasks(tasks, taskFile.id);

    logger.info(
      { taskFileId: taskFile.id, taskCount: tasks.length },
      '[TaskFileService] < parseCsvAndCreateTasks - successfully fanned out tasks',
    );

    return taskFile.id;
  } catch (error) {
    logger.error(
      { error: String(error) },
      '[TaskFileService] < parseCsvAndCreateTasks - failed to parse CSV and fan out tasks',
    );
    throw error;
  }
};

/**
 * Increments the processed count and sets processing status to IN_PROGRESS for a TaskFile.
 * @param taskFileId - The ID of the TaskFile to update
 * @param incrementBy - The number to increment the processed count by (default is 1)
 * @returns The updated TaskFile
 */
export const incrementTaskFileProcessedCount = async (
  taskFileId: string,
  incrementBy: number = 1,
): Promise<TaskFile> => {
  logger.info({ taskFileId }, '[TaskFileService] > incrementTaskFileProcessedCount');

  // Track if the processed count was successfully incremented for potential rollback
  let isCountIncremented = false;
  try {
    const command = new UpdateCommand({
      TableName: config.TASK_FILE_TABLE,
      Key: {
        pk: TaskFileKeys.pk(taskFileId),
        sk: TaskFileKeys.sk(),
      },
      UpdateExpression:
        'SET processingStatus = :processingStatus, processedCount = processedCount + :inc, unprocessedCount = unprocessedCount - :inc, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':processingStatus': ProcessingStatus.IN_PROGRESS,
        ':inc': incrementBy,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    });
    logger.debug({ input: command.input }, '[TaskFileService] incrementTaskFileProcessedCount - UpdateCommandInput');

    const result = await dynamoDocClient.send(command);
    isCountIncremented = true;
    const taskFile = toTaskFile(result.Attributes as TaskFileItem);
    logger.debug({ taskFile }, '[TaskFileService] incrementTaskFileProcessedCount - updated TaskFile');

    // If unprocessedCount reaches zero, publish to SNS topic that processing is complete
    if (taskFile.unprocessedCount === 0) {
      await publishToTopic(
        config.TASK_TOPIC_ARN,
        { taskFile },
        {
          event: {
            DataType: 'String',
            StringValue: SNSEventName.taskFileProcessingComplete,
          },
        },
      );
    }

    logger.info(
      { taskFileId },
      '[TaskFileService] < incrementTaskFileProcessedCount - successfully updated processed count',
    );
    return taskFile;
  } catch (error) {
    logger.error(
      { taskFileId, error: String(error) },
      '[TaskFileService] < incrementTaskFileProcessedCount - failed to update processed count in DynamoDB',
    );

    // If the processed count was incremented but an error occurred later, attempt to roll back the increment
    if (isCountIncremented) {
      try {
        await incrementTaskFileProcessedCount(taskFileId, -incrementBy);
        logger.info(
          { taskFileId },
          '[TaskFileService] incrementTaskFileProcessedCount - rolled back processed count increment',
        );
      } catch (rollbackError) {
        logger.error(
          { taskFileId, error: String(rollbackError) },
          '[TaskFileService] incrementTaskFileProcessedCount - failed to roll back processed count increment',
        );
      }
    }

    throw error;
  }
};

/**
 * Updates the processing status of a TaskFile.
 * @param taskFileId - The ID of the TaskFile to update
 * @param processingStatus - The new processing status to set
 * @returns The updated TaskFile
 */
export const updateTaskFileStatus = async (
  taskFileId: string,
  processingStatus: ProcessingStatus,
): Promise<TaskFile> => {
  logger.info({ taskFileId, processingStatus }, '[TaskFileService] > updateTaskFileStatus');

  try {
    const command = new UpdateCommand({
      TableName: config.TASK_FILE_TABLE,
      Key: {
        pk: TaskFileKeys.pk(taskFileId),
        sk: TaskFileKeys.sk(),
      },
      UpdateExpression: 'SET processingStatus = :processingStatus, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':processingStatus': processingStatus,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    });
    logger.debug({ input: command.input }, '[TaskFileService] updateTaskFileStatus - UpdateCommandInput');

    const result = await dynamoDocClient.send(command);
    const taskFile = toTaskFile(result.Attributes as TaskFileItem);
    logger.debug({ taskFile }, '[TaskFileService] updateTaskFileStatus - updated TaskFile');

    logger.info({ taskFileId }, '[TaskFileService] < updateTaskFileStatus - successfully updated status');
    return taskFile;
  } catch (error) {
    logger.error(
      { taskFileId, error: String(error) },
      '[TaskFileService] < updateTaskFileStatus - failed to update status in DynamoDB',
    );
    throw error;
  }
};
