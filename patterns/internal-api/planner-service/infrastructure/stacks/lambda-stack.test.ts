import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
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
      const stack = new LambdaStack(testApp, 'TestLambdaStack', {
        appName: 'smp-planner-service',
        envName: 'dev',
        loggingEnabled: true,
        loggingLevel: 'debug',
        loggingFormat: 'json',
        corsAllowOrigin: '*',
        listTasksFunctionName: 'smp-task-service-list-tasks-dev',
      });
      template = Template.fromStack(stack);
    });

    it('should create a daily planner Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-planner-service-daily-planner-dev',
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
            LOGGING_ENABLED: 'true',
            LOGGING_LEVEL: 'debug',
            LOGGING_FORMAT: 'json',
            CORS_ALLOW_ORIGIN: '*',
            LIST_TASKS_FUNCTION_NAME: 'smp-task-service-list-tasks-dev',
          },
        },
      });
    });

    it('should create an API Gateway REST API', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'smp-planner-service-api-dev',
        Description: 'Daily Planner API for dev environment',
      });
    });

    it('should create a /planner resource', () => {
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'planner',
      });
    });

    it('should create a /planner/daily resource', () => {
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'daily',
      });
    });

    it('should create a GET method on /planner/daily', () => {
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
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

    it('should export API URL', () => {
      template.hasOutput('ApiUrl', {
        Export: {
          Name: 'smp-planner-service-daily-planner-api-url-dev',
        },
      });
    });

    it('should export API ID', () => {
      template.hasOutput('ApiId', {
        Export: {
          Name: 'smp-planner-service-daily-planner-api-id-dev',
        },
      });
    });

    it('should export daily planner function ARN', () => {
      template.hasOutput('DailyPlannerFunctionArn', {
        Export: {
          Name: 'smp-planner-service-daily-planner-function-arn-dev',
        },
      });
    });
  });

  describe('prd environment', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();
      const stack = new LambdaStack(testApp, 'TestLambdaStack', {
        appName: 'smp-planner-service',
        envName: 'prd',
        loggingEnabled: true,
        loggingLevel: 'info',
        loggingFormat: 'json',
        corsAllowOrigin: '*',
        listTasksFunctionName: 'smp-task-service-list-tasks-prd',
      });
      template = Template.fromStack(stack);
    });

    it('should create Lambda with prd naming', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-planner-service-daily-planner-prd',
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
        Name: 'smp-planner-service-api-prd',
        Description: 'Daily Planner API for prd environment',
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
      const stack = new LambdaStack(testApp, 'TestLambdaStack', {
        appName: 'smp-planner-service',
        envName: 'dev',
        loggingEnabled: true,
        loggingLevel: 'debug',
        loggingFormat: 'json',
        corsAllowOrigin: '*',
        listTasksFunctionName: 'smp-task-service-list-tasks-dev',
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
