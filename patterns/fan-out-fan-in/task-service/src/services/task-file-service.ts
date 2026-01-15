/**
 * @module TaskFileService
 * @description Service for managing TaskFile records in DynamoDB and processing CSV uploads.
 */

import { randomUUID } from 'crypto';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { CreateTaskFileDto } from '../models/create-task-file-dto.js';
import { ProcessingStatus, TaskFile, TaskFileItem, TaskFileKeys, toTaskFile } from '../models/task-file.js';
import { parseCsv } from './csv-service.js';
import { fanOutCreateTasks } from './task-service.js';
import { config } from '../utils/config.js';
import { dynamoDocClient } from '../utils/dynamodb-client.js';
import { logger } from '../utils/logger.js';

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

export const incrementTaskFileProcessedCount = async (taskFileId: string): Promise<TaskFile> => {
  logger.info({ taskFileId }, '[TaskFileService] > incrementTaskFileProcessedCount');

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
        ':inc': 1,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    });
    logger.debug({ input: command.input }, '[TaskFileService] incrementTaskFileProcessedCount - UpdateCommandInput');

    const result = await dynamoDocClient.send(command);
    const taskFile = toTaskFile(result.Attributes as TaskFileItem);
    logger.debug({ taskFile }, '[TaskFileService] incrementTaskFileProcessedCount - updated TaskFile');

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
    throw error;
  }
};
