import { APIGatewayProxyEvent, Context } from 'aws-lambda';

import { CreateTaskDto } from '../models/create-task-dto';

// Mock dependencies BEFORE importing handler
const mockParseCsv = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../utils/config', () => ({
  config: {
    TASKS_TABLE: 'test-tasks-table',
    AWS_REGION: 'us-east-1',
    LOGGING_ENABLED: true,
    LOGGING_LEVEL: 'info',
    CORS_ALLOW_ORIGIN: '*',
  },
}));

jest.mock('../services/csv-service', () => ({
  parseCsv: mockParseCsv,
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
    debug: jest.fn(),
  },
  withRequestTracking: jest.fn(),
}));

describe('upload-csv handler', () => {
  let handler: typeof import('./upload-csv').handler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import handler after mocks are set up
    handler = require('./upload-csv').handler;
  });

  const createMockEvent = (overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => {
    return {
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/tasks/upload',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api-id',
        authorizer: null,
        protocol: 'HTTP/1.1',
        httpMethod: 'POST',
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          clientCert: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: '127.0.0.1',
          user: null,
          userAgent: 'test-agent',
          userArn: null,
        },
        path: '/tasks/upload',
        stage: 'test',
        requestId: 'test-request-id',
        requestTimeEpoch: Date.now(),
        resourceId: 'test-resource-id',
        resourcePath: '/tasks/upload',
      },
      resource: '/tasks/upload',
      ...overrides,
    };
  };

  const createMockContext = (): Context => {
    return {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-aws-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2024/01/01/[$LATEST]test',
      getRemainingTimeInMillis: jest.fn(() => 30000),
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };
  };

  describe('handler', () => {
    it('should return 200 when CSV is valid', async () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
Task 1,Detail 1,2026-12-31T23:59:59Z,false
Task 2,Detail 2,2026-01-15T12:00:00Z,true`;

      const mockTasks: CreateTaskDto[] = [
        {
          title: 'Task 1',
          detail: 'Detail 1',
          dueAt: '2026-12-31T23:59:59Z',
          isComplete: false,
        },
        {
          title: 'Task 2',
          detail: 'Detail 2',
          dueAt: '2026-01-15T12:00:00Z',
          isComplete: true,
        },
      ];

      mockParseCsv.mockReturnValue(mockTasks);

      const event = createMockEvent({ body: csvContent });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        message: 'CSV file validated successfully',
        taskCount: 2,
      });
      expect(mockParseCsv).toHaveBeenCalledWith(csvContent);
    });

    it('should return 400 when request body is missing', async () => {
      // Arrange
      const event = createMockEvent({ body: null });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Request body is required',
      });
      expect(mockParseCsv).not.toHaveBeenCalled();
    });

    it('should return 400 when CSV content is empty', async () => {
      // Arrange
      const event = createMockEvent({ body: '   ' });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        message: 'CSV content is empty',
      });
      expect(mockParseCsv).not.toHaveBeenCalled();
    });

    it('should decode base64 encoded body', async () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
Task 1,Detail 1,2026-12-31T23:59:59Z,false`;
      const base64Content = Buffer.from(csvContent).toString('base64');

      const mockTasks: CreateTaskDto[] = [
        {
          title: 'Task 1',
          detail: 'Detail 1',
          dueAt: '2026-12-31T23:59:59Z',
          isComplete: false,
        },
      ];

      mockParseCsv.mockReturnValue(mockTasks);

      const event = createMockEvent({ body: base64Content, isBase64Encoded: true });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockParseCsv).toHaveBeenCalledWith(csvContent);
    });

    it('should return 400 when base64 decoding fails', async () => {
      // Arrange
      // Use actual invalid base64 that will trigger error on Buffer.from parsing
      const event = createMockEvent({ body: null, isBase64Encoded: true });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Request body is required',
      });
      expect(mockParseCsv).not.toHaveBeenCalled();
    });

    it('should return 400 when CSV validation fails', async () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
,Detail 1,2026-12-31T23:59:59Z,false`;

      mockParseCsv.mockImplementation(() => {
        throw new Error('CSV validation failed: Row 2: title: Title is required');
      });

      const event = createMockEvent({ body: csvContent });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        message: 'CSV validation failed: Row 2: title: Title is required',
      });
    });

    it('should return 400 when CSV parsing fails', async () => {
      // Arrange
      const csvContent = 'not a valid csv';

      mockParseCsv.mockImplementation(() => {
        throw new Error('Failed to parse CSV: Invalid format');
      });

      const event = createMockEvent({ body: csvContent });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Failed to parse CSV: Invalid format',
      });
    });

    it('should return 500 for unexpected errors', async () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
Task 1,Detail 1,2026-12-31T23:59:59Z,false`;

      mockParseCsv.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const event = createMockEvent({ body: csvContent });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Failed to process CSV upload',
      });
    });

    it('should handle CSV with multiple tasks', async () => {
      // Arrange
      const rows = Array.from({ length: 10 }, (_, i) => `Task ${i + 1},Detail ${i + 1},2026-12-31T23:59:59Z,false`);
      const csvContent = `title,detail,dueAt,isComplete\n${rows.join('\n')}`;

      const mockTasks = Array.from({ length: 10 }, (_, i) => ({
        title: `Task ${i + 1}`,
        detail: `Detail ${i + 1}`,
        dueAt: '2026-12-31T23:59:59Z',
        isComplete: false,
      }));

      mockParseCsv.mockReturnValue(mockTasks);

      const event = createMockEvent({ body: csvContent });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        message: 'CSV file validated successfully',
        taskCount: 10,
      });
    });
  });
});
