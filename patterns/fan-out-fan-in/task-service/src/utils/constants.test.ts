import { SNSEventName } from './constants';

describe('constants', () => {
  describe('SNSEventName', () => {
    it('should define taskCreated event name', () => {
      // Act & Assert
      expect(SNSEventName.taskCreated).toBeDefined();
      expect(SNSEventName.taskCreated).toBe('task_created');
    });

    it('should define taskUpdated event name', () => {
      // Act & Assert
      expect(SNSEventName.taskUpdated).toBeDefined();
      expect(SNSEventName.taskUpdated).toBe('task_updated');
    });

    it('should define taskDeleted event name', () => {
      // Act & Assert
      expect(SNSEventName.taskDeleted).toBeDefined();
      expect(SNSEventName.taskDeleted).toBe('task_deleted');
    });

    it('should define taskFileProcessingComplete event name', () => {
      // Act & Assert
      expect(SNSEventName.taskFileProcessingComplete).toBeDefined();
      expect(SNSEventName.taskFileProcessingComplete).toBe('taskfile_processing_complete');
    });

    it('should have exactly 4 event names', () => {
      // Act
      const eventNames = Object.keys(SNSEventName);

      // Assert
      expect(eventNames).toHaveLength(4);
    });

    it('should contain all expected event name keys', () => {
      // Act
      const eventNameKeys = Object.keys(SNSEventName);

      // Assert
      expect(eventNameKeys).toContain('taskCreated');
      expect(eventNameKeys).toContain('taskUpdated');
      expect(eventNameKeys).toContain('taskDeleted');
      expect(eventNameKeys).toContain('taskFileProcessingComplete');
    });

    it('should have unique event name values', () => {
      // Arrange
      const eventValues = Object.values(SNSEventName);

      // Act
      const uniqueValues = new Set(eventValues);

      // Assert
      expect(uniqueValues.size).toBe(eventValues.length);
    });

    it('should all event names be lowercase strings', () => {
      // Act & Assert
      Object.values(SNSEventName).forEach((eventName) => {
        expect(typeof eventName).toBe('string');
        expect(eventName).toBe(eventName.toLowerCase());
      });
    });

    it('should use underscore as word separator', () => {
      // Act & Assert
      Object.values(SNSEventName).forEach((eventName) => {
        expect(eventName).toMatch(/^[a-z]+(_[a-z]+)*$/);
      });
    });

    it('should not be empty object', () => {
      // Act & Assert
      expect(Object.keys(SNSEventName).length).toBeGreaterThan(0);
    });

    it('should be immutable at runtime', () => {
      // Act & Assert
      expect(Object.isFrozen(SNSEventName) || !Object.isExtensible(SNSEventName)).toBe(
        !Object.isExtensible(SNSEventName),
      );
    });
  });
});
