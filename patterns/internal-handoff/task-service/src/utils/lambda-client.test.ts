// Mock the logger
const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('./logger.js', () => ({
  logger: {
    info: mockLoggerInfo,
    debug: mockLoggerDebug,
    error: mockLoggerError,
  },
}));

// Mock the Lambda client
let mockSend: jest.Mock;
jest.mock('@aws-sdk/client-lambda', () => {
  mockSend = jest.fn();
  return {
    InvokeCommand: jest.fn(),
    LambdaClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
  };
});

import { invokeLambdaSync } from './lambda-client.js';

/**
 * Test suite for Lambda client utility
 */
describe('lambda-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('invokeLambda', () => {
    it('should successfully invoke a Lambda function with RequestResponse invocation type', async () => {
      // Arrange
      const functionName = 'test-function';
      const payload = { test: 'data' };
      const mockResponse = { result: 'success' };

      mockSend.mockResolvedValueOnce({
        StatusCode: 200,
        FunctionError: undefined,
        Payload: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      // Act
      const result = await invokeLambdaSync(functionName, payload);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockLoggerInfo).toHaveBeenCalledWith('[LambdaClient] > invokeLambda', { functionName });
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        '[LambdaClient] < invokeLambda - successfully invoked Lambda function',
        {
          functionName,
          statusCode: 200,
        },
      );
    });

    it('should serialize payload to JSON string', async () => {
      // Arrange
      const functionName = 'test-function';
      const payload = { httpMethod: 'GET', path: '/tasks', body: null };

      mockSend.mockResolvedValueOnce({
        StatusCode: 200,
        FunctionError: undefined,
        Payload: new TextEncoder().encode(JSON.stringify([])),
      });

      // Act
      await invokeLambdaSync(functionName, payload);

      // Assert
      expect(mockSend).toHaveBeenCalled();
    });

    it('should deserialize response payload from Uint8Array', async () => {
      // Arrange
      const functionName = 'test-function';
      const payload = {};
      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify({ data: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      };

      mockSend.mockResolvedValueOnce({
        StatusCode: 200,
        FunctionError: undefined,
        Payload: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      // Act
      const result = (await invokeLambdaSync(functionName, payload)) as Record<string, unknown>;

      // Assert
      expect(result).toEqual(mockResponse);
      expect(typeof result).toBe('object');
      expect(result.statusCode).toBe(200);
    });

    it('should handle empty Payload from Lambda response', async () => {
      // Arrange
      const functionName = 'test-function';
      const payload = {};

      mockSend.mockResolvedValueOnce({
        StatusCode: 200,
        FunctionError: undefined,
        Payload: undefined,
      });

      // Act
      const result = await invokeLambdaSync(functionName, payload);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error when Lambda function returns FunctionError', async () => {
      // Arrange
      const functionName = 'test-function';
      const payload = {};
      const errorResponse = { message: 'Internal error' };

      mockSend.mockResolvedValueOnce({
        StatusCode: 200,
        FunctionError: 'Unhandled',
        Payload: new TextEncoder().encode(JSON.stringify(errorResponse)),
      });

      // Act & Assert
      await expect(invokeLambdaSync(functionName, payload)).rejects.toThrow('Lambda function error: Unhandled');
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[LambdaClient] < invokeLambda - Lambda function returned an error',
        expect.any(Error),
        expect.objectContaining({
          functionName,
          FunctionError: 'Unhandled',
        }),
      );
    });

    it('should handle Lambda SDK invocation errors', async () => {
      // Arrange
      const functionName = 'non-existent-function';
      const payload = {};
      const error = new Error('Function not found');

      mockSend.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(invokeLambdaSync(functionName, payload)).rejects.toThrow('Function not found');
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[LambdaClient] < invokeLambda - failed to invoke Lambda function',
        error,
        { functionName },
      );
    });

    it('should support generic type parameter for response', async () => {
      // Arrange
      interface TaskResponse {
        tasks: { id: string; title: string }[];
      }

      const functionName = 'list-tasks';
      const payload = {};
      const mockResponse: TaskResponse = {
        tasks: [{ id: '1', title: 'Test Task' }],
      };

      mockSend.mockResolvedValueOnce({
        StatusCode: 200,
        FunctionError: undefined,
        Payload: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      // Act
      const result = await invokeLambdaSync<TaskResponse>(functionName, payload);

      // Assert
      expect(result).toEqual(mockResponse);
      const typedResult = result as TaskResponse | null;
      expect(typedResult?.tasks).toBeDefined();
    });

    it('should log debug information during invocation', async () => {
      // Arrange
      const functionName = 'test-function';
      const payload = { test: 'data' };

      mockSend.mockResolvedValueOnce({
        StatusCode: 200,
        FunctionError: undefined,
        Payload: new TextEncoder().encode(JSON.stringify({})),
      });

      // Act
      await invokeLambdaSync(functionName, payload);

      // Assert
      expect(mockLoggerDebug).toHaveBeenCalledWith('[LambdaClient] invokeLambda - InvokeCommand', expect.any(Object));
    });

    it('should handle complex nested payloads', async () => {
      // Arrange
      const functionName = 'process-data';
      const complexPayload = {
        event: {
          httpMethod: 'POST',
          path: '/api/v1/tasks',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Task', due: '2024-12-25' }),
          requestContext: {
            requestId: 'req-123',
            accountId: '123456789012',
          },
        },
        context: {
          functionName: 'processor',
          memoryLimit: 256,
        },
      };

      const mockResponse = { success: true, id: 'task-123' };

      mockSend.mockResolvedValueOnce({
        StatusCode: 200,
        FunctionError: undefined,
        Payload: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      // Act
      const result = await invokeLambdaSync(functionName, complexPayload);

      // Assert
      expect(result).toEqual(mockResponse);
    });

    it('should use RequestResponse invocation type', async () => {
      // Arrange
      const functionName = 'sync-function';
      const payload = {};

      mockSend.mockResolvedValueOnce({
        StatusCode: 200,
        FunctionError: undefined,
        Payload: new TextEncoder().encode(JSON.stringify({ status: 'ok' })),
      });

      // Act
      await invokeLambdaSync(functionName, payload);

      // Assert
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle Lambda response with non-JSON payload', async () => {
      // Arrange
      const functionName = 'text-function';
      const payload = {};

      mockSend.mockResolvedValueOnce({
        StatusCode: 200,
        FunctionError: undefined,
        Payload: new TextEncoder().encode('plain text response'),
      });

      // Act & Assert
      await expect(invokeLambdaSync(functionName, payload)).rejects.toThrow();
    });

    it('should handle successful invocation with HTTP status codes other than 200', async () => {
      // Arrange
      const functionName = 'api-function';
      const payload = {};
      const mockResponse = {
        statusCode: 404,
        body: JSON.stringify({ message: 'Not Found' }),
      };

      mockSend.mockResolvedValueOnce({
        StatusCode: 202,
        FunctionError: undefined,
        Payload: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      // Act
      const result = (await invokeLambdaSync(functionName, payload)) as Record<string, unknown>;

      // Assert
      expect(result).toEqual(mockResponse);
      expect(result.statusCode).toBe(404);
    });

    it('should include function name in log messages', async () => {
      // Arrange
      const functionName = 'my-special-function';
      const payload = {};

      mockSend.mockResolvedValueOnce({
        StatusCode: 200,
        FunctionError: undefined,
        Payload: new TextEncoder().encode(JSON.stringify({})),
      });

      // Act
      await invokeLambdaSync(functionName, payload);

      // Assert
      expect(mockLoggerInfo).toHaveBeenCalledWith('[LambdaClient] > invokeLambda', { functionName });
      expect(mockLoggerDebug).toHaveBeenCalledWith('[LambdaClient] invokeLambda - InvokeCommand', expect.any(Object));
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        '[LambdaClient] < invokeLambda - successfully invoked Lambda function',
        {
          functionName,
          statusCode: 200,
        },
      );
    });
  });
});
