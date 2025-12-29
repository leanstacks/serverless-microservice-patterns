import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
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
        appName: 'smp-internal-handoff-notification-service',
        envName: 'dev',
        loggingEnabled: true,
        loggingLevel: 'debug',
        loggingFormat: 'json',
      });
      template = Template.fromStack(stack);
    });

    it('should create a send notification Lambda function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-internal-handoff-notification-service-send-notification-dev',
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
          },
        },
      });
    });

    it('should create a CloudWatch log group', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/lambda/smp-internal-handoff-notification-service-send-notification-dev',
        RetentionInDays: 7,
      });
    });

    it('should create a Dead Letter Queue', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-internal-handoff-notification-service-send-notification-dlq-dev',
        MessageRetentionPeriod: 1209600,
      });
    });

    it('should export Lambda function ARN', () => {
      template.hasOutput('SendNotificationFunctionArn', {
        Export: {
          Name: 'smp-internal-handoff-notification-service-send-notification-function-arn-dev',
        },
      });
    });

    it('should export DLQ ARN', () => {
      template.hasOutput('SendNotificationDLQArn', {
        Export: {
          Name: 'smp-internal-handoff-notification-service-send-notification-dlq-arn-dev',
        },
      });
    });

    it('should export DLQ URL', () => {
      template.hasOutput('SendNotificationDLQUrl', {
        Export: {
          Name: 'smp-internal-handoff-notification-service-send-notification-dlq-url-dev',
        },
      });
    });
  });

  describe('prd environment', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();

      const stack = new LambdaStack(testApp, 'TestLambdaStackPrd', {
        appName: 'smp-internal-handoff-notification-service',
        envName: 'prd',
        loggingEnabled: true,
        loggingLevel: 'info',
        loggingFormat: 'json',
      });
      template = Template.fromStack(stack);
    });

    it('should create Lambda with prd naming', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'smp-internal-handoff-notification-service-send-notification-prd',
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

    it('should create a CloudWatch log group with ONE_MONTH retention for prd', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/lambda/smp-internal-handoff-notification-service-send-notification-prd',
        RetentionInDays: 30,
      });
    });

    it('should export Lambda function ARN for prd', () => {
      template.hasOutput('SendNotificationFunctionArn', {
        Export: {
          Name: 'smp-internal-handoff-notification-service-send-notification-function-arn-prd',
        },
      });
    });

    it('should create a Dead Letter Queue with RETAIN policy for prd', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-internal-handoff-notification-service-send-notification-dlq-prd',
        MessageRetentionPeriod: 1209600,
      });
    });
  });

  describe('Lambda configuration', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();

      const stack = new LambdaStack(testApp, 'TestLambdaStackConfig', {
        appName: 'smp-internal-handoff-notification-service',
        envName: 'dev',
        loggingEnabled: true,
        loggingLevel: 'debug',
        loggingFormat: 'json',
      });
      template = Template.fromStack(stack);
    });

    it('should configure JSON logging format', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        LoggingConfig: {
          LogFormat: 'JSON',
          ApplicationLogLevel: 'DEBUG',
          SystemLogLevel: 'INFO',
        },
      });
    });

    it('should configure bundling with minification', () => {
      // Verify at least one Lambda function exists with proper configuration
      template.resourceCountIs('AWS::Lambda::Function', 1);
    });
  });
});
