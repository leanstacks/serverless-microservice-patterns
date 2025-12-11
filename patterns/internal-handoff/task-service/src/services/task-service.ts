import { randomUUID } from 'crypto';
import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { CreateTaskDto } from '../models/create-task-dto.js';
import { UpdateTaskDto } from '../models/update-task-dto.js';
import { Task, TaskItem, TaskKeys, toTask } from '../models/task.js';
import { config } from '../utils/config.js';
import { dynamoDocClient } from '../utils/dynamodb-client.js';
import { logger } from '../utils/logger.js';

/**
 * Retrieves all tasks from the DynamoDB table
 * @returns Promise that resolves to an array of Task objects
 * @throws Error if the DynamoDB scan operation fails
 */
export const listTasks = async (): Promise<Task[]> => {
  logger.info('[TaskService] > listTasks', { tableName: config.TASKS_TABLE });

  try {
    const command = new ScanCommand({
      TableName: config.TASKS_TABLE,
    });
    logger.debug('[TaskService] listTasks - ScanCommand', { command });

    const response = await dynamoDocClient.send(command);

    const taskItems = (response.Items as TaskItem[]) ?? [];
    const tasks = taskItems.map(toTask);

    logger.info('[TaskService] < listTasks - successfully retrieved tasks', {
      count: tasks.length,
      scannedCount: response.ScannedCount,
    });

    return tasks;
  } catch (error) {
    logger.error('[TaskService] < listTasks - failed to fetch tasks from DynamoDB', error as Error, {
      tableName: config.TASKS_TABLE,
    });
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
  logger.info('[TaskService] > getTask', { tableName: config.TASKS_TABLE, id });

  try {
    const command = new GetCommand({
      TableName: config.TASKS_TABLE,
      Key: {
        pk: TaskKeys.pk(id),
      },
    });
    logger.debug('[TaskService] getTask - GetCommand', { command });

    const response = await dynamoDocClient.send(command);

    if (!response.Item) {
      logger.info('[TaskService] < getTask - task not found', { id });
      return null;
    }

    const task = toTask(response.Item as TaskItem);

    logger.info('[TaskService] < getTask - successfully retrieved task', { id });

    return task;
  } catch (error) {
    logger.error('[TaskService] < getTask - failed to fetch task from DynamoDB', error as Error, {
      tableName: config.TASKS_TABLE,
      id,
    });
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
  logger.info('[TaskService] > createTask', { tableName: config.TASKS_TABLE });

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
    logger.debug('[TaskService] createTask - PutCommand', { command });

    await dynamoDocClient.send(command);

    const task = toTask(taskItem);

    logger.info('[TaskService] < createTask - successfully created task', {
      id: task.id,
    });

    return task;
  } catch (error) {
    logger.error('[TaskService] < createTask - failed to create task in DynamoDB', error as Error, {
      tableName: config.TASKS_TABLE,
    });
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
  logger.info('[TaskService] > updateTask', { tableName: config.TASKS_TABLE, id });

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
    logger.debug('[TaskService] updateTask - UpdateCommand', { command });

    const response = await dynamoDocClient.send(command);

    if (!response.Attributes) {
      logger.info('[TaskService] < updateTask - task not found', { id });
      return null;
    }

    const task = toTask(response.Attributes as TaskItem);

    logger.info('[TaskService] < updateTask - successfully updated task', { id });

    return task;
  } catch (error) {
    // Check if the error is a conditional check failure (task not found)
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      logger.info('[TaskService] < updateTask - task not found', { id });
      return null;
    }

    logger.error('[TaskService] < updateTask - failed to update task in DynamoDB', error as Error, {
      tableName: config.TASKS_TABLE,
      id,
    });
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
  logger.info('[TaskService] > deleteTask', { tableName: config.TASKS_TABLE, id });

  try {
    const command = new DeleteCommand({
      TableName: config.TASKS_TABLE,
      Key: {
        pk: TaskKeys.pk(id),
      },
      ConditionExpression: 'attribute_exists(pk)',
    });
    logger.debug('[TaskService] deleteTask - DeleteCommand', { command });

    await dynamoDocClient.send(command);

    logger.info('[TaskService] < deleteTask - successfully deleted task', { id });

    return true;
  } catch (error) {
    // Check if the error is a conditional check failure (task not found)
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      logger.info('[TaskService] < deleteTask - task not found', { id });
      return false;
    }

    logger.error('[TaskService] < deleteTask - failed to delete task from DynamoDB', error as Error, {
      tableName: config.TASKS_TABLE,
      id,
    });
    throw error;
  }
};
