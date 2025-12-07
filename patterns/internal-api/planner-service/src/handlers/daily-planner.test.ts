import { APIGatewayProxyEvent, Context } from 'aws-lambda';

import { Task } from '../models/task.js';

// Mock dependencies BEFORE importing handler
const mockInvokeLambda = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../utils/config', () => ({
  config: {
    AWS_REGION: 'us-east-1',
    LOGGING_ENABLED: true,
    LOGGING_LEVEL: 'info',
    CORS_ALLOW_ORIGIN: '*',
    LIST_TASKS_FUNCTION_NAME: 'test-app-list-tasks-test',
  },
}));

jest.mock('../utils/lambda-client', () => ({
  invokeLambda: mockInvokeLambda,
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    debug: mockLoggerDebug,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

/**
 * Test suite for Daily Planner handler
 */
describe('daily-planner handler', () => {
  let handler: typeof import('./daily-planner.js').handler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import handler after mocks are set up
    handler = require('./daily-planner').handler;
  });

  const createMockEvent = (overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => {
    return {
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/planner/daily',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api-id',
        authorizer: null,
        protocol: 'HTTP/1.1',
        httpMethod: 'GET',
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
        path: '/planner/daily',
        stage: 'test',
        requestId: 'test-request-id',
        requestTimeEpoch: Date.now(),
        resourceId: 'test-resource-id',
        resourcePath: '/planner/daily',
      },
      resource: '/planner/daily',
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
      logStreamName: '2025/12/01/[$LATEST]test',
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {},
    };
  };

  it('should successfully retrieve daily planner data with tasks', async () => {
    // Arrange
    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Test Task 1',
        isComplete: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'Test Task 2',
        isComplete: true,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ];

    const listTasksResponse = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(mockTasks),
    };

    mockInvokeLambda.mockResolvedValueOnce(listTasksResponse);

    const event = createMockEvent();
    const context = createMockContext();

    // Act
    const result = await handler(event, context);

    // Assert
    expect(result.statusCode).toBe(200);
    expect(result.headers).toBeDefined();
    expect(result.headers?.['Content-Type']).toBe('application/json');

    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('tasks');
    expect(body.tasks).toHaveLength(2);
    expect(body.tasks[0].id).toBe('1');
    expect(body.tasks[1].id).toBe('2');
    expect(mockInvokeLambda).toHaveBeenCalledTimes(1);
    expect(mockInvokeLambda).toHaveBeenCalledWith(
      'test-app-list-tasks-test',
      expect.objectContaining({
        httpMethod: 'GET',
        path: '/tasks',
      }),
    );
  });

  it('should return empty tasks array when ListTasks returns empty list', async () => {
    // Arrange
    const listTasksResponse = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify([]),
    };

    mockInvokeLambda.mockResolvedValueOnce(listTasksResponse);

    const event = createMockEvent();
    const context = createMockContext();

    // Act
    const result = await handler(event, context);

    // Assert
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.tasks).toHaveLength(0);
  });

  it('should return error when ListTasks function invocation fails', async () => {
    // Arrange
    mockInvokeLambda.mockRejectedValueOnce(new Error('Lambda invocation failed'));

    const event = createMockEvent();
    const context = createMockContext();

    // Act
    const result = await handler(event, context);

    // Assert
    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('message');
    expect(body.message).toBe('Failed to retrieve daily planner data');
  });

  it('should handle empty response body from ListTasks', async () => {
    // Arrange
    const listTasksResponse = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
    };

    mockInvokeLambda.mockResolvedValueOnce(listTasksResponse);

    const event = createMockEvent();
    const context = createMockContext();

    // Act
    const result = await handler(event, context);

    // Assert
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.tasks).toHaveLength(0);
  });
});
