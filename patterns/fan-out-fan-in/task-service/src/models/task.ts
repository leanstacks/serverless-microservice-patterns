/**
 * Prefix for task partition keys in Single Table Design
 */
export const TASK_PK_PREFIX = 'TASK#';

/**
 * Type representing a Task (without DynamoDB-specific fields)
 */
export type Task = {
  id: string;
  title: string;
  detail?: string;
  dueAt?: string;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Type representing a Task as stored in DynamoDB (Single Table Design)
 * Extends Task with partition key for Single Table Design
 */
export type TaskItem = Task & {
  pk: string; // Partition key: TASK#<uuid>
};

/**
 * Transforms a TaskItem from DynamoDB into a Task
 * @param taskItem - The task item from DynamoDB
 * @returns Task object without DynamoDB-specific fields
 */
export const toTask = (taskItem: TaskItem): Task => {
  const { pk: _pk, ...task } = taskItem;
  return task;
};

/**
 * Keys for DynamoDB operations related to Task items using Single Table Design.
 * These keys help in constructing keys for tasks.
 */
export const TaskKeys = {
  pk: (id: string) => `${TASK_PK_PREFIX}${id}`,
};
