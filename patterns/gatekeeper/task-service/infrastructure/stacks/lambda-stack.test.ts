import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { LambdaStack } from './lambda-stack';

// Mock NodejsFunction to avoid Docker bundling during tests
jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => {
  const actual = jest.requireActual('aws-cdk-lib/aws-lambda-nodejs');
  const lambdaModule = jest.requireActual('aws-cdk-lib/aws-lambda');
  return {
    ...actual,
    NodejsFunction: class extends lambdaModule.Function {
      constructor(scope: any, id: string, props: any) {
        // Use inline code instead of bundling for tests
        super(scope, id, {
          ...props,
          code: lambdaModule.Code.fromInline('exports.handler = async () => {}'),
        });
      }
    },
  };
});

/**
 * Helper function to create a mock auth service stack that exports the authorizer function ARN
 * Note: We only mock the authorizer function since this stack now owns the API Gateway
 */
function createMockAuthorizerFunction(testApp: cdk.App): lambda.Function {
  const mockAuthStack = new cdk.Stack(testApp, 'MockAuthStack');

  // Create mock authorizer function
  const mockAuthorizerFunction = new lambda.Function(mockAuthStack, 'MockAuthorizerFunction', {
    functionName: 'mock-authorizer-function',
    runtime: lambda.Runtime.NODEJS_24_X,
    handler: 'index.handler',
    code: lambda.Code.fromInline('exports.handler = async () => {};'),
  });

  // Export the function ARN (simulating what auth-service exports)
  new cdk.CfnOutput(mockAuthStack, 'AuthorizerFunctionArn', {
    value: mockAuthorizerFunction.functionArn,
    exportName: 'mock-authorizer-function-arn',
  });

  return mockAuthorizerFunction;
}

describe('LambdaStack', () => {
  describe('dev environment', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();

      // Create mock DynamoDB table
      const mockTestStack = new cdk.Stack(testApp, 'MockStack');
      const testMockTable = new dynamodb.Table(mockTestStack, 'MockTaskTable', {
        tableName: 'mock-task-table',
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
      });

      // Create mock auth service authorizer function
      const mockAuthorizerFunction = createMockAuthorizerFunction(testApp);

      // Create the task service Lambda stack with API Gateway
      const stack = new LambdaStack(testApp, 'TestLambdaStack', {
        appName: 'smp-gatekeeper-task-service',
        envName: 'dev',
        taskTable: testMockTable,
        authorizerFunctionArn: mockAuthorizerFunction.functionArn,
        loggingEnabled: true,
        loggingLevel: 'debug',
        loggingFormat: 'json',
        corsAllowOrigin: '*',
      });
      template = Template.fromStack(stack);
    });

    it('should create a list tasks Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-gatekeeper-task-service-list-tasks-dev',
        Runtime: 'nodejs24.x',
        Handler: 'handler',
        Timeout: 10,
        MemorySize: 256,
      });
    });

    it('should create a get task Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-gatekeeper-task-service-get-task-dev',
        Runtime: 'nodejs24.x',
        Handler: 'handler',
        Timeout: 10,
        MemorySize: 256,
      });
    });

    it('should create a create task Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-gatekeeper-task-service-create-task-dev',
        Runtime: 'nodejs24.x',
        Handler: 'handler',
        Timeout: 10,
        MemorySize: 256,
      });
    });

    it('should create an update task Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-gatekeeper-task-service-update-task-dev',
        Runtime: 'nodejs24.x',
        Handler: 'handler',
        Timeout: 10,
        MemorySize: 256,
      });
    });

    it('should create a delete task Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-gatekeeper-task-service-delete-task-dev',
        Runtime: 'nodejs24.x',
        Handler: 'handler',
        Timeout: 10,
        MemorySize: 256,
      });
    });

    it('should configure Lambda environment variables', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            TASKS_TABLE: Match.anyValue(),
            LOGGING_ENABLED: 'true',
            LOGGING_LEVEL: 'debug',
            LOGGING_FORMAT: 'json',
            CORS_ALLOW_ORIGIN: '*',
          },
        },
      });
    });

    it('should grant Lambda read access to DynamoDB', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith([
                'dynamodb:BatchGetItem',
                'dynamodb:Query',
                'dynamodb:GetItem',
                'dynamodb:Scan',
                'dynamodb:ConditionCheckItem',
              ]),
            }),
          ]),
        },
      });
    });

    it('should grant Lambda write access to DynamoDB', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith([
                'dynamodb:BatchWriteItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
              ]),
            }),
          ]),
        },
      });
    });

    it('should export list tasks function ARN', () => {
      template.hasOutput('ListTasksFunctionArn', {
        Export: {
          Name: 'smp-gatekeeper-task-service-list-tasks-function-arn-dev',
        },
      });
    });

    it('should export get task function ARN', () => {
      template.hasOutput('GetTaskFunctionArn', {
        Export: {
          Name: 'smp-gatekeeper-task-service-get-task-function-arn-dev',
        },
      });
    });

    it('should export create task function ARN', () => {
      template.hasOutput('CreateTaskFunctionArn', {
        Export: {
          Name: 'smp-gatekeeper-task-service-create-task-function-arn-dev',
        },
      });
    });

    it('should export update task function ARN', () => {
      template.hasOutput('UpdateTaskFunctionArn', {
        Export: {
          Name: 'smp-gatekeeper-task-service-update-task-function-arn-dev',
        },
      });
    });

    it('should export delete task function ARN', () => {
      template.hasOutput('DeleteTaskFunctionArn', {
        Export: {
          Name: 'smp-gatekeeper-task-service-delete-task-function-arn-dev',
        },
      });
    });
  });

  describe('prd environment', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();

      // Create mock DynamoDB table
      const mockTestStack = new cdk.Stack(testApp, 'MockStack');
      const testMockTable = new dynamodb.Table(mockTestStack, 'MockTaskTable', {
        tableName: 'mock-task-table',
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
      });

      // Create mock auth service authorizer function
      const mockAuthorizerFunction = createMockAuthorizerFunction(testApp);

      // Create the task service Lambda stack with API Gateway
      const stack = new LambdaStack(testApp, 'TestLambdaStack', {
        appName: 'smp-gatekeeper-task-service',
        envName: 'prd',
        taskTable: testMockTable,
        authorizerFunctionArn: mockAuthorizerFunction.functionArn,
        loggingEnabled: true,
        loggingLevel: 'info',
        loggingFormat: 'json',
        corsAllowOrigin: '*',
      });
      template = Template.fromStack(stack);
    });

    it('should create Lambda with prd naming', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-gatekeeper-task-service-list-tasks-prd',
      });
    });

    it('should configure info log level for prd', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            LOGGING_LEVEL: 'info',
          },
        },
      });
    });
  });

  describe('cross-stack integration', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();

      // Create mock DynamoDB table
      const mockTestStack = new cdk.Stack(testApp, 'MockStack');
      const testMockTable = new dynamodb.Table(mockTestStack, 'MockTaskTable', {
        tableName: 'mock-task-table',
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
      });

      // Create mock auth service authorizer function
      const mockAuthorizerFunction = createMockAuthorizerFunction(testApp);

      // Create the task service Lambda stack with API Gateway
      const stack = new LambdaStack(testApp, 'TestLambdaStack', {
        appName: 'smp-gatekeeper-task-service',
        envName: 'dev',
        taskTable: testMockTable,
        authorizerFunctionArn: mockAuthorizerFunction.functionArn,
        loggingEnabled: true,
        loggingLevel: 'debug',
        loggingFormat: 'json',
        corsAllowOrigin: '*',
      });
      template = Template.fromStack(stack);
    });

    it('should create API Gateway REST API', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'smp-gatekeeper-task-service-api-dev',
      });
    });

    it('should create TokenAuthorizer using imported authorizer function', () => {
      template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
        Type: 'TOKEN',
      });
    });

    it('should reference DynamoDB table by name', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            TASKS_TABLE: Match.anyValue(),
          },
        },
      });
    });
  });

  describe('Lambda function count', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();

      // Create mock DynamoDB table
      const mockTestStack = new cdk.Stack(testApp, 'MockStack');
      const testMockTable = new dynamodb.Table(mockTestStack, 'MockTaskTable', {
        tableName: 'mock-task-table',
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
      });

      // Create mock auth service authorizer function
      const mockAuthorizerFunction = createMockAuthorizerFunction(testApp);

      // Create the task service Lambda stack with API Gateway
      const stack = new LambdaStack(testApp, 'TestLambdaStack', {
        appName: 'smp-gatekeeper-task-service',
        envName: 'dev',
        taskTable: testMockTable,
        authorizerFunctionArn: mockAuthorizerFunction.functionArn,
        loggingEnabled: true,
        loggingLevel: 'debug',
        loggingFormat: 'json',
        corsAllowOrigin: '*',
      });
      template = Template.fromStack(stack);
    });

    it('should create exactly 5 Lambda functions', () => {
      template.resourceCountIs('AWS::Lambda::Function', 5);
    });

    it('should create 5 CloudFormation outputs for function ARNs', () => {
      // Verify all function ARNs are exported
      const functionNames = ['ListTasks', 'GetTask', 'CreateTask', 'UpdateTask', 'DeleteTask'];
      functionNames.forEach((name) => {
        template.hasOutput(`${name}FunctionArn`, Match.anyValue());
      });
    });
  });
});
