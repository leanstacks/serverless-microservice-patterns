import { z } from 'zod';

/**
 * Data transfer object for creating a TaskFile
 */
export type CreateTaskFileDto = {
  recordCount: number;
  fileName: string;
};

/**
 * Zod schema for validating CreateTaskFileDto
 */
export const CreateTaskFileDtoSchema = z.object({
  recordCount: z.number().int().min(0, 'recordCount must be a non-negative integer'),
  fileName: z.string().min(1, 'fileName is required').max(1024, 'fileName must not exceed 1024 characters'),
});
