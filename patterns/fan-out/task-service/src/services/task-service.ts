import { randomUUID } from 'crypto';
import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { CreateTaskDto } from '../models/create-task-dto.js';
import { UpdateTaskDto } from '../models/update-task-dto.js';
import { Task, TaskItem, TaskKeys, toTask } from '../models/task.js';
import { config } from '../utils/config.js';
import { dynamoDocClient } from '../utils/dynamodb-client.js';
import { logger } from '../utils/logger.js';
import { sendToQueue } from '../utils/sqs-client.js';

/**
 * Retrieves all tasks from the DynamoDB table
 * @returns Promise that resolves to an array of Task objects
 * @throws Error if the DynamoDB scan operation fails
 */
export const listTasks = async (): Promise<Task[]> => {
  logger.info('[TaskService] > listTasks');

  try {
    const command = new ScanCommand({
      TableName: config.TASKS_TABLE,
    });
    logger.debug({ input: command.input }, '[TaskService] listTasks - ScanCommandInput');

    const response = await dynamoDocClient.send(command);

    const taskItems = (response.Items as TaskItem[]) ?? [];
    const tasks = taskItems.map(toTask);

    logger.info(
      {
        count: tasks.length,
        scannedCount: response.ScannedCount,
      },
      '[TaskService] < listTasks - successfully retrieved tasks',
    );

    return tasks;
  } catch (error) {
    logger.error({ error }, '[TaskService] < listTasks - failed to fetch tasks from DynamoDB');
    throw error;
  }
};

/**
 * Retrieves a task by ID from the DynamoDB table
 * @param id - The unique identifier of the task
 * @returns Promise that resolves to the Task object if found, or null if not found
 * @throws Error if the DynamoDB get operation fails
 */
export const getTask = async (id: string): Promise<Task | null> => {
  logger.info('[TaskService] > getTask');

  try {
    const command = new GetCommand({
      TableName: config.TASKS_TABLE,
      Key: {
        pk: TaskKeys.pk(id),
      },
    });
    logger.debug({ input: command.input }, '[TaskService] getTask - GetCommandInput');

    const response = await dynamoDocClient.send(command);

    if (!response.Item) {
      logger.info({ taskId: id }, '[TaskService] < getTask - task not found');
      return null;
    }

    const task = toTask(response.Item as TaskItem);

    logger.info({ id: task.id }, '[TaskService] < getTask - successfully retrieved task');
    return task;
  } catch (error) {
    logger.error({ error }, '[TaskService] < getTask - failed to fetch task from DynamoDB');
    throw error;
  }
};

/**
 * Creates a new task in the DynamoDB table
 * @param createTaskDto - The data for the new task
 * @returns Promise that resolves to the created Task object
 * @throws Error if the DynamoDB put operation fails
 */
export const createTask = async (createTaskDto: CreateTaskDto): Promise<Task> => {
  logger.info('[TaskService] > createTask');

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const taskItem: TaskItem = {
      pk: TaskKeys.pk(id),
      id,
      title: createTaskDto.title,
      ...(createTaskDto.detail && { detail: createTaskDto.detail }),
      ...(createTaskDto.dueAt && { dueAt: createTaskDto.dueAt }),
      isComplete: createTaskDto.isComplete ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const command = new PutCommand({
      TableName: config.TASKS_TABLE,
      Item: taskItem,
    });
    logger.debug({ input: command.input }, '[TaskService] createTask - PutCommandInput');

    await dynamoDocClient.send(command);

    const task = toTask(taskItem);

    logger.info({ id: task.id }, '[TaskService] < createTask - successfully created task');
    return task;
  } catch (error) {
    logger.error({ error }, '[TaskService] < createTask - failed to create task in DynamoDB');
    throw error;
  }
};

/**
 * Updates an existing task in the DynamoDB table
 * @param id - The unique identifier of the task to update
 * @param updateTaskDto - The data to update the task with
 * @returns Promise that resolves to the updated Task object if found, or null if not found
 * @throws Error if the DynamoDB update operation fails
 */
export const updateTask = async (id: string, updateTaskDto: UpdateTaskDto): Promise<Task | null> => {
  logger.info('[TaskService] > updateTask');

  try {
    const now = new Date().toISOString();

    // Build update expression dynamically
    const setExpressions: string[] = ['title = :title', 'isComplete = :isComplete', 'updatedAt = :updatedAt'];
    const removeExpressions: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {
      ':title': updateTaskDto.title,
      ':isComplete': updateTaskDto.isComplete,
      ':updatedAt': now,
    };

    // Handle optional detail field
    if (updateTaskDto.detail !== undefined) {
      setExpressions.push('detail = :detail');
      expressionAttributeValues[':detail'] = updateTaskDto.detail;
    } else {
      // Remove detail if not present in request
      removeExpressions.push('detail');
    }

    // Handle optional dueAt field
    if (updateTaskDto.dueAt !== undefined) {
      setExpressions.push('dueAt = :dueAt');
      expressionAttributeValues[':dueAt'] = updateTaskDto.dueAt;
    } else {
      // Remove dueAt if not present in request
      removeExpressions.push('dueAt');
    }

    // Construct the update expression with proper syntax
    const updateExpressionParts: string[] = [];
    if (setExpressions.length > 0) {
      updateExpressionParts.push(`SET ${setExpressions.join(', ')}`);
    }
    if (removeExpressions.length > 0) {
      updateExpressionParts.push(`REMOVE ${removeExpressions.join(', ')}`);
    }
    const updateExpression = updateExpressionParts.join(' ');

    const command = new UpdateCommand({
      TableName: config.TASKS_TABLE,
      Key: {
        pk: TaskKeys.pk(id),
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    });
    logger.debug({ input: command.input }, '[TaskService] updateTask - UpdateCommandInput');

    const response = await dynamoDocClient.send(command);

    if (!response.Attributes) {
      logger.info({ taskId: id }, '[TaskService] < updateTask - task not found');
      return null;
    }

    const task = toTask(response.Attributes as TaskItem);

    logger.info({ taskId: id }, '[TaskService] < updateTask - successfully updated task');
    return task;
  } catch (error) {
    // Check if the error is a conditional check failure (task not found)
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      logger.info({ taskId: id }, '[TaskService] < updateTask - task not found');
      return null;
    }

    logger.error({ error }, '[TaskService] < updateTask - failed to update task in DynamoDB');
    throw error;
  }
};

/**
 * Deletes a task from the DynamoDB table
 * @param id - The unique identifier of the task to delete
 * @returns Promise that resolves to true if the task was deleted, or false if not found
 * @throws Error if the DynamoDB delete operation fails
 */
export const deleteTask = async (id: string): Promise<boolean> => {
  logger.info('[TaskService] > deleteTask');

  try {
    const command = new DeleteCommand({
      TableName: config.TASKS_TABLE,
      Key: {
        pk: TaskKeys.pk(id),
      },
      ConditionExpression: 'attribute_exists(pk)',
    });
    logger.debug({ input: command.input }, '[TaskService] deleteTask - DeleteCommandInput');

    await dynamoDocClient.send(command);

    logger.info({ taskId: id }, '[TaskService] < deleteTask - successfully deleted task');
    return true;
  } catch (error) {
    // Check if the error is a conditional check failure (task not found)
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      logger.info({ taskId: id }, '[TaskService] < deleteTask - task not found');
      return false;
    }

    logger.error({ error }, '[TaskService] < deleteTask - failed to delete task from DynamoDB');
    throw error;
  }
};

/**
 * Fans out create task DTOs by publishing each as a message to the Create Task SQS queue
 * @param createTaskDtos - Array of CreateTaskDto objects to fan out
 * @returns Promise that resolves to an array of message IDs for successfully published messages
 * @throws Error if the SQS send operations fail
 */
export const fanOutCreateTasks = async (createTaskDtos: CreateTaskDto[]): Promise<string[]> => {
  logger.info({ count: createTaskDtos.length }, '[TaskService] > fanOutCreateTasks');

  try {
    // Publish each CreateTaskDto to the queue in parallel
    const publishPromises = createTaskDtos.map(async (dto) => {
      return sendToQueue(config.CREATE_TASK_QUEUE_URL, dto as Record<string, unknown>);
    });

    const messageIds = await Promise.all(publishPromises);
    logger.debug({ messageIds }, '[TaskService] fanOutCreateTasks - published message IDs');

    logger.info(
      { count: messageIds.length },
      '[TaskService] < fanOutCreateTasks - successfully published messages to queue',
    );
    return messageIds;
  } catch (error) {
    logger.error({ error }, '[TaskService] < fanOutCreateTasks - failed to publish messages to queue');
    throw error;
  }
};
