/**
 * @module utils/constants
 * @description Application-wide constants used across the Task Service.
 */

/**
 * SNS Event Names used for publishing messages to SNS topics.
 */
export const SNSEventName = {
  taskCreated: 'task_created',
  taskUpdated: 'task_updated',
  taskDeleted: 'task_deleted',
  taskFileProcessingComplete: 'taskfile_processing_complete',
};
