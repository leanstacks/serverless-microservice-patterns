import { z } from 'zod';

/**
 * Zod schema for validating create task request body
 */
export const CreateTaskDtoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must not exceed 100 characters'),
  detail: z.string().max(1000, 'Detail must not exceed 1000 characters').optional(),
  dueAt: z.iso.datetime({ message: 'Due date must be a valid ISO8601 timestamp' }).optional(),
  isComplete: z.boolean().default(false),
});

/**
 * Type representing the validated create task DTO
 */
export type CreateTaskDto = z.infer<typeof CreateTaskDtoSchema>;
