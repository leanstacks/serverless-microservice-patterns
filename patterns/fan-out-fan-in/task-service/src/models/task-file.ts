import z from 'zod';

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
 * Zod schema for validating TaskFile objects
 */
export const TaskFileSchema = z.object({
  id: z.uuid({ message: 'id must be a valid UUID', version: 'v4' }),
  fileName: z.string().min(1).max(1024),
  processingStatus: z.enum(ProcessingStatus),
  recordCount: z.number().int().min(0),
  processedCount: z.number().int().min(0),
  unprocessedCount: z.number().int().min(0),
  createdAt: z.iso.datetime('createdAt must be a valid ISO date string'),
  updatedAt: z.iso.datetime('updatedAt must be a valid ISO date string'),
});

/**
 * Type representing a TaskFile (without DynamoDB-specific fields)
 */
export type TaskFile = z.infer<typeof TaskFileSchema>;

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
