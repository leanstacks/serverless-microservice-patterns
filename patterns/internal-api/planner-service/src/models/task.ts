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
