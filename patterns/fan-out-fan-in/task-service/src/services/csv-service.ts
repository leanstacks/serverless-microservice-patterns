import { parse } from 'csv-parse/sync';
import { z } from 'zod';

import { CreateTaskDto, CreateTaskDtoSchema } from '../models/create-task-dto.js';
import { logger } from '../utils/logger.js';

/**
 * Parses a CSV string into an array of CreateTaskDto objects
 * Validates each row against the CreateTaskDto schema
 *
 * @param csvContent - The CSV file content as a string
 * @returns Array of validated CreateTaskDto objects
 * @throws Error if CSV parsing fails or validation fails
 */
export const parseCsv = (csvContent: string): CreateTaskDto[] => {
  logger.info('[CsvService] > parseCsv');

  try {
    // Parse CSV content
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    logger.debug({ recordCount: records.length }, '[CsvService] parseCsv - parsed CSV records');

    // Validate and transform each record
    const tasks: CreateTaskDto[] = [];
    const errors: Array<{ row: number; errors: string[] }> = [];

    records.forEach((record, index) => {
      const rowNumber = index + 2; // +2 because of header row and 1-based indexing

      try {
        // Transform CSV strings to proper types and validate
        const taskDto: unknown = {
          title: record.title,
          detail: record.detail || undefined,
          dueAt: record.dueAt || undefined,
          isComplete: record.isComplete === 'true' || record.isComplete === '1',
        };

        // Validate against CreateTaskDto schema
        const validatedTask = CreateTaskDtoSchema.parse(taskDto);
        tasks.push(validatedTask);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationMessages = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
          errors.push({ row: rowNumber, errors: validationMessages });
        } else {
          errors.push({ row: rowNumber, errors: ['Unknown validation error'] });
        }
      }
    });

    // If there are any validation errors, throw an error with details
    if (errors.length > 0) {
      const errorMessage = errors.map((e) => `Row ${e.row}: ${e.errors.join(', ')}`).join('; ');
      logger.warn({ errors }, '[CsvService] < parseCsv - validation errors');
      throw new Error(`CSV validation failed: ${errorMessage}`);
    }

    logger.info({ taskCount: tasks.length }, '[CsvService] < parseCsv - successfully parsed and validated CSV');
    return tasks;
  } catch (error) {
    if (error instanceof Error && error.message.includes('CSV validation failed')) {
      throw error;
    }
    logger.error({ error }, '[CsvService] < parseCsv - failed to parse CSV');
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
