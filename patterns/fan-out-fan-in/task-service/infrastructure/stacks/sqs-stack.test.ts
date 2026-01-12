import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Template } from 'aws-cdk-lib/assertions';

import { SqsStack } from './sqs-stack';

describe('SqsStack', () => {
  let app: cdk.App;
  let stack: SqsStack;
  let template: Template;

  const defaultProps = {
    appName: 'test-app',
    envName: 'dev',
  };

  beforeEach(() => {
    app = new cdk.App();
  });

  describe('Queue Creation', () => {
    it('should create a Create Task Queue with correct properties', () => {
      // Arrange & Act
      stack = new SqsStack(app, 'TestSqsStack', defaultProps);
      template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test-app-create-task-queue-dev',
        VisibilityTimeout: 60,
        MessageRetentionPeriod: 1209600, // 14 days in seconds
      });
    });

    it('should create a Dead Letter Queue with correct properties', () => {
      // Arrange & Act
      stack = new SqsStack(app, 'TestSqsStack', defaultProps);
      template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test-app-create-task-queue-dlq-dev',
        MessageRetentionPeriod: 1209600, // 14 days in seconds
      });
    });

    it('should configure dead letter queue with maxReceiveCount of 3', () => {
      // Arrange & Act
      stack = new SqsStack(app, 'TestSqsStack', defaultProps);
      template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test-app-create-task-queue-dev',
        RedrivePolicy: {
          maxReceiveCount: 3,
        },
      });
    });
  });

  describe('Environment-specific Configuration', () => {
    it('should set RETAIN removal policy for production environment', () => {
      // Arrange & Act
      stack = new SqsStack(app, 'TestSqsStack', {
        ...defaultProps,
        envName: 'prd',
      });
      template = Template.fromStack(stack);

      // Assert
      template.hasResource('AWS::SQS::Queue', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });

    it('should set DESTROY removal policy for non-production environment', () => {
      // Arrange & Act
      stack = new SqsStack(app, 'TestSqsStack', {
        ...defaultProps,
        envName: 'dev',
      });
      template = Template.fromStack(stack);

      // Assert
      template.hasResource('AWS::SQS::Queue', {
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      });
    });
  });

  describe('CloudFormation Outputs', () => {
    beforeEach(() => {
      stack = new SqsStack(app, 'TestSqsStack', defaultProps);
      template = Template.fromStack(stack);
    });

    it('should output Create Task Queue URL', () => {
      // Assert
      template.hasOutput('CreateTaskQueueUrl', {
        Description: 'URL of the Create Task Queue',
        Export: {
          Name: 'test-app-create-task-queue-url-dev',
        },
      });
    });

    it('should output Create Task Queue ARN', () => {
      // Assert
      template.hasOutput('CreateTaskQueueArn', {
        Description: 'ARN of the Create Task Queue',
        Export: {
          Name: 'test-app-create-task-queue-arn-dev',
        },
      });
    });

    it('should output Create Task DLQ URL', () => {
      // Assert
      template.hasOutput('CreateTaskDLQUrl', {
        Description: 'URL of the Create Task Dead Letter Queue',
        Export: {
          Name: 'test-app-create-task-dlq-url-dev',
        },
      });
    });

    it('should output Create Task DLQ ARN', () => {
      // Assert
      template.hasOutput('CreateTaskDLQArn', {
        Description: 'ARN of the Create Task Dead Letter Queue',
        Export: {
          Name: 'test-app-create-task-dlq-arn-dev',
        },
      });
    });
  });

  describe('Stack Properties', () => {
    it('should create exactly two SQS queues', () => {
      // Arrange & Act
      stack = new SqsStack(app, 'TestSqsStack', defaultProps);
      template = Template.fromStack(stack);

      // Assert
      template.resourceCountIs('AWS::SQS::Queue', 2);
    });

    it('should expose createTaskQueue as a public property', () => {
      // Arrange & Act
      stack = new SqsStack(app, 'TestSqsStack', defaultProps);

      // Assert
      expect(stack.createTaskQueue).toBeDefined();
      expect(stack.createTaskQueue).toBeInstanceOf(sqs.Queue);
    });

    it('should expose createTaskDLQ as a public property', () => {
      // Arrange & Act
      stack = new SqsStack(app, 'TestSqsStack', defaultProps);

      // Assert
      expect(stack.createTaskDLQ).toBeDefined();
      expect(stack.createTaskDLQ).toBeInstanceOf(sqs.Queue);
    });
  });

  describe('Queue Naming', () => {
    it('should use correct naming pattern for different environments', () => {
      // Arrange
      const environments = ['dev', 'qat', 'prd'];

      environments.forEach((env) => {
        // Create a new app for each environment to avoid synthesis conflicts
        const envApp = new cdk.App();

        // Act
        const envStack = new SqsStack(envApp, `TestSqsStack-${env}`, {
          ...defaultProps,
          envName: env,
        });
        const envTemplate = Template.fromStack(envStack);

        // Assert
        envTemplate.hasResourceProperties('AWS::SQS::Queue', {
          QueueName: `test-app-create-task-queue-${env}`,
        });
        envTemplate.hasResourceProperties('AWS::SQS::Queue', {
          QueueName: `test-app-create-task-queue-dlq-${env}`,
        });
      });
    });

    it('should use appName in queue naming', () => {
      // Arrange & Act
      stack = new SqsStack(app, 'TestSqsStack', {
        ...defaultProps,
        appName: 'custom-app-name',
      });
      template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'custom-app-name-create-task-queue-dev',
      });
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'custom-app-name-create-task-queue-dlq-dev',
      });
    });
  });
});
