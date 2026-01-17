/**
 * @module models/create-task-message
 * @description Zod schema and type definition for create task messages sent to the Create Task SQS queue.
 */

import { z } from 'zod';

import { CreateTaskDtoSchema } from './create-task-dto';

/**
 * Zod schema for validating create task messages sent to the Create Task SQS queue
 */
export const CreateTaskMessageSchema = z.object({
  task: CreateTaskDtoSchema,
  taskFileId: z.uuid({ message: 'taskFileId must be a valid UUID', version: 'v4' }),
});

/**
 * Type representing the validated create task message
 */
export type CreateTaskMessage = z.infer<typeof CreateTaskMessageSchema>;
