/**
 * Prefix for task file partition keys in Single Table Design
 */
export const TASKFILE_PK_PREFIX = 'TASKFILE#';

/**
 * Sort key for task file items
 */
export const TASKFILE_SK = 'DETAIL';

/**
 * Processing status enumeration for task files
 */
export enum ProcessingStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

/**
 * Type representing a TaskFile (without DynamoDB-specific fields)
 */
export type TaskFile = {
  id: string;
  fileName: string;
  processingStatus: ProcessingStatus;
  recordCount: number;
  processedCount: number;
  unprocessedCount: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Type representing a TaskFile as stored in DynamoDB (Single Table Design)
 * Extends TaskFile with partition and sort keys for Single Table Design
 */
export type TaskFileItem = TaskFile & {
  pk: string; // Partition key: TASKFILE#<uuid>
  sk: string; // Sort key: DETAIL
};

/**
 * Transforms a TaskFileItem from DynamoDB into a TaskFile
 * @param taskFileItem - The task file item from DynamoDB
 * @returns TaskFile object without DynamoDB-specific fields
 */
export const toTaskFile = (taskFileItem: TaskFileItem): TaskFile => {
  const { pk: _pk, sk: _sk, ...taskFile } = taskFileItem;
  return taskFile;
};

/**
 * Keys for DynamoDB operations related to TaskFile items using Single Table Design.
 * These keys help in constructing keys for task files.
 */
export const TaskFileKeys = {
  pk: (id: string) => `${TASKFILE_PK_PREFIX}${id}`,
  sk: () => TASKFILE_SK,
};
