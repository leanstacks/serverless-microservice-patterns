import { DailyPlanner } from './daily-planner';
import { Task } from './task';

/**
 * Test suite for DailyPlanner model
 */
describe('DailyPlanner model', () => {
  it('should create a valid DailyPlanner with empty tasks array', () => {
    // Arrange & Act
    const dailyPlanner: DailyPlanner = {
      tasks: [],
    };

    // Assert
    expect(dailyPlanner).toBeDefined();
    expect(dailyPlanner.tasks).toEqual([]);
  });

  it('should create a valid DailyPlanner with tasks', () => {
    // Arrange
    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Task 1',
        isComplete: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'Task 2',
        detail: 'Task detail',
        isComplete: true,
        createdAt: '2025-01-02T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z',
      },
    ];

    // Act
    const dailyPlanner: DailyPlanner = {
      tasks: mockTasks,
    };

    // Assert
    expect(dailyPlanner).toBeDefined();
    expect(dailyPlanner.tasks).toHaveLength(2);
    expect(dailyPlanner.tasks[0]?.id).toBe('1');
    expect(dailyPlanner.tasks[1]?.id).toBe('2');
  });

  it('should have tasks property with array type', () => {
    // Arrange
    const dailyPlanner: DailyPlanner = {
      tasks: [],
    };

    // Assert
    expect(Array.isArray(dailyPlanner.tasks)).toBe(true);
  });
});
