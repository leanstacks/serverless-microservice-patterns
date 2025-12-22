import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SqsStack } from './sqs-stack';

describe('SqsStack', () => {
  describe('dev environment', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();

      const stack = new SqsStack(testApp, 'TestSqsStack', {
        appName: 'smp-pubsub-notification-service',
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    it('should create a Notification Queue', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-pubsub-notification-service-notification-dev',
        MessageRetentionPeriod: 345600,
        VisibilityTimeout: 60,
      });
    });

    it('should create a Dead Letter Queue', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-pubsub-notification-service-notification-dlq-dev',
        MessageRetentionPeriod: 1209600,
      });
    });

    it('should configure redrive policy from queue to DLQ', () => {
      const queueResources = template.findResources('AWS::SQS::Queue');
      const queues = Object.values(queueResources);
      const notificationQueue = queues.find(
        (q: any) => q.Properties?.QueueName?.includes('notification-') && !q.Properties?.QueueName?.includes('dlq'),
      );
      expect(notificationQueue?.Properties?.RedrivePolicy).toBeDefined();
    });

    it('should export Notification Queue ARN', () => {
      template.hasOutput('NotificationQueueArn', {
        Export: {
          Name: 'smp-pubsub-notification-service-notification-queue-arn-dev',
        },
      });
    });

    it('should export Notification Queue URL', () => {
      template.hasOutput('NotificationQueueUrl', {
        Export: {
          Name: 'smp-pubsub-notification-service-notification-queue-url-dev',
        },
      });
    });

    it('should export Notification Queue DLQ ARN', () => {
      template.hasOutput('NotificationQueueDLQArn', {
        Export: {
          Name: 'smp-pubsub-notification-service-notification-dlq-arn-dev',
        },
      });
    });

    it('should export Notification Queue DLQ URL', () => {
      template.hasOutput('NotificationQueueDLQUrl', {
        Export: {
          Name: 'smp-pubsub-notification-service-notification-dlq-url-dev',
        },
      });
    });
  });

  describe('prd environment', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();

      const stack = new SqsStack(testApp, 'TestSqsStackPrd', {
        appName: 'smp-pubsub-notification-service',
        envName: 'prd',
      });
      template = Template.fromStack(stack);
    });

    it('should create a Notification Queue for prd', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-pubsub-notification-service-notification-prd',
        MessageRetentionPeriod: 345600,
        VisibilityTimeout: 60,
      });
    });

    it('should create a Dead Letter Queue with RETAIN policy for prd', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-pubsub-notification-service-notification-dlq-prd',
        MessageRetentionPeriod: 1209600,
      });
    });
  });
});
