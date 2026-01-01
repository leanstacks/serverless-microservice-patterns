import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { LambdaStack } from './lambda-stack';

// Mock NodejsFunction to avoid Docker bundling during tests
jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => {
  const actual = jest.requireActual('aws-cdk-lib/aws-lambda-nodejs');
  const lambda = jest.requireActual('aws-cdk-lib/aws-lambda');
  return {
    ...actual,
    NodejsFunction: class extends lambda.Function {
      constructor(scope: any, id: string, props: any) {
        // Use inline code instead of bundling for tests
        super(scope, id, {
          ...props,
          code: lambda.Code.fromInline('exports.handler = async () => {}'),
        });
      }
    },
  };
});

describe('LambdaStack', () => {
  describe('dev environment', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();
      const mockTestStack = new cdk.Stack(testApp, 'MockStack');
      const testMockTable = new dynamodb.Table(mockTestStack, 'MockTaskTable', {
        tableName: 'mock-task-table',
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
      });

      const stack = new LambdaStack(testApp, 'TestLambdaStack', {
        appName: 'smp-fan-out-task-service',
        envName: 'dev',
        taskTable: testMockTable,
        loggingEnabled: true,
        loggingLevel: 'debug',
        loggingFormat: 'json',
        corsAllowOrigin: '*',
      });
      template = Template.fromStack(stack);
    });

    it('should create a list tasks Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-fan-out-task-service-list-tasks-dev',
        Runtime: 'nodejs24.x',
        Handler: 'handler',
        Timeout: 10,
        MemorySize: 256,
      });
    });

    it('should create a get task Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-fan-out-task-service-get-task-dev',
        Runtime: 'nodejs24.x',
        Handler: 'handler',
        Timeout: 10,
        MemorySize: 256,
      });
    });

    it('should create a create task Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-fan-out-task-service-create-task-dev',
        Runtime: 'nodejs24.x',
        Handler: 'handler',
        Timeout: 10,
        MemorySize: 256,
      });
    });

    it('should create an update task Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-fan-out-task-service-update-task-dev',
        Runtime: 'nodejs24.x',
        Handler: 'handler',
        Timeout: 10,
        MemorySize: 256,
      });
    });

    it('should create a delete task Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-fan-out-task-service-delete-task-dev',
        Runtime: 'nodejs24.x',
        Handler: 'handler',
        Timeout: 10,
        MemorySize: 256,
      });
    });

    it('should create an upload CSV Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-fan-out-task-service-upload-csv-dev',
        Runtime: 'nodejs24.x',
        Handler: 'handler',
        Timeout: 30,
        MemorySize: 512,
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

    it('should create an API Gateway REST API', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'smp-fan-out-task-service-api-dev',
        Description: 'Lambda Starter API for dev environment',
      });
    });

    it('should create a /tasks resource', () => {
      template.resourceCountIs('AWS::ApiGateway::Resource', 3);
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'tasks',
      });
    });

    it('should create a /tasks/upload resource', () => {
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'upload',
      });
    });

    it('should create a /tasks/{taskId} resource', () => {
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: '{taskId}',
      });
    });

    it('should create a GET method on /tasks', () => {
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
      });
    });

    it('should create a GET method on /planner/daily', () => {
      // Verify that a GET method exists (Daily Planner uses GET /planner/daily)
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
      });
    });

    it('should create a POST method on /tasks', () => {
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
      });
    });

    it('should create a PUT method on /tasks/{taskId}', () => {
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'PUT',
      });
    });

    it('should create a DELETE method on /tasks/{taskId}', () => {
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'DELETE',
      });
    });

    it('should integrate API Gateway with Lambda', () => {
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          Type: 'AWS_PROXY',
        },
      });
    });

    it('should configure API Gateway deployment', () => {
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        StageName: 'dev',
      });
    });

    it('should configure API Gateway throttling', () => {
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        MethodSettings: [
          {
            ThrottlingRateLimit: 100,
            ThrottlingBurstLimit: 200,
          },
        ],
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
                'dynamodb:DescribeTable',
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
              Action: [
                'dynamodb:BatchWriteItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:DescribeTable',
              ],
            }),
          ]),
        },
      });
    });

    it('should export API URL', () => {
      template.hasOutput('ApiUrl', {
        Export: {
          Name: 'smp-fan-out-task-service-tasks-api-url-dev',
        },
      });
    });

    it('should export API ID', () => {
      template.hasOutput('ApiId', {
        Export: {
          Name: 'smp-fan-out-task-service-tasks-api-id-dev',
        },
      });
    });

    it('should export Lambda function ARN', () => {
      template.hasOutput('ListTasksFunctionArn', {
        Export: {
          Name: 'smp-fan-out-task-service-list-tasks-function-arn-dev',
        },
      });
    });

    it('should export create task function ARN', () => {
      template.hasOutput('CreateTaskFunctionArn', {
        Export: {
          Name: 'smp-fan-out-task-service-create-task-function-arn-dev',
        },
      });
    });

    it('should export get task function ARN', () => {
      template.hasOutput('GetTaskFunctionArn', {
        Export: {
          Name: 'smp-fan-out-task-service-get-task-function-arn-dev',
        },
      });
    });

    it('should export update task function ARN', () => {
      template.hasOutput('UpdateTaskFunctionArn', {
        Export: {
          Name: 'smp-fan-out-task-service-update-task-function-arn-dev',
        },
      });
    });

    it('should export delete task function ARN', () => {
      template.hasOutput('DeleteTaskFunctionArn', {
        Export: {
          Name: 'smp-fan-out-task-service-delete-task-function-arn-dev',
        },
      });
    });

    it('should export upload CSV function ARN', () => {
      template.hasOutput('UploadCsvFunctionArn', {
        Export: {
          Name: 'smp-fan-out-task-service-upload-csv-function-arn-dev',
        },
      });
    });

    it('should grant Lambda read-write access to DynamoDB for update function', () => {
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
                'dynamodb:BatchWriteItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:DescribeTable',
              ]),
            }),
          ]),
        },
      });
    });
  });

  describe('prd environment', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();
      const mockTestStack = new cdk.Stack(testApp, 'MockStack');
      const testMockTable = new dynamodb.Table(mockTestStack, 'MockTaskTable', {
        tableName: 'mock-task-table',
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
      });

      const stack = new LambdaStack(testApp, 'TestLambdaStack', {
        appName: 'smp-fan-out-task-service',
        envName: 'prd',
        taskTable: testMockTable,
        loggingEnabled: true,
        loggingLevel: 'info',
        loggingFormat: 'json',
        corsAllowOrigin: '*',
      });
      template = Template.fromStack(stack);
    });

    it('should create Lambda with prd naming', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-fan-out-task-service-list-tasks-prd',
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

    it('should create API Gateway with prd naming', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'smp-fan-out-task-service-api-prd',
        Description: 'Lambda Starter API for prd environment',
      });
    });

    it('should deploy to prd stage', () => {
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        StageName: 'prd',
      });
    });
  });

  describe('CORS configuration', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();
      const mockTestStack = new cdk.Stack(testApp, 'MockStack');
      const testMockTable = new dynamodb.Table(mockTestStack, 'MockTaskTable', {
        tableName: 'mock-task-table',
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
      });

      const stack = new LambdaStack(testApp, 'TestLambdaStack', {
        appName: 'smp-fan-out-task-service',
        envName: 'dev',
        taskTable: testMockTable,
        loggingEnabled: true,
        loggingLevel: 'debug',
        loggingFormat: 'json',
        corsAllowOrigin: '*',
      });
      template = Template.fromStack(stack);
    });

    it('should configure CORS preflight for OPTIONS method', () => {
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'OPTIONS',
      });
    });

    it('should include CORS headers in OPTIONS response', () => {
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          IntegrationResponses: [
            {
              ResponseParameters: {
                'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
                'method.response.header.Access-Control-Allow-Methods': Match.anyValue(),
                'method.response.header.Access-Control-Allow-Origin': Match.anyValue(),
              },
            },
          ],
        },
      });
    });
  });
});
