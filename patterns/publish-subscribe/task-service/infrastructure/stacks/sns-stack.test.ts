import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SnsStack } from './sns-stack';

describe('SnsStack', () => {
  describe('dev environment', () => {
    let template: Template;
    let stack: SnsStack;

    beforeAll(() => {
      const testApp = new cdk.App();
      stack = new SnsStack(testApp, 'TestSnsStack', {
        appName: 'smp-pubsub-task-service',
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    it('should create a Task SNS topic', () => {
      template.resourceCountIs('AWS::SNS::Topic', 1);
    });

    it('should create a Task SNS topic with correct naming', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'smp-pubsub-task-service-task-dev',
        DisplayName: 'Task Service Events Topic',
      });
    });

    it('should create a standard (non-FIFO) SNS topic', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        FifoTopic: false,
      });
    });

    it('should export topic ARN', () => {
      const outputs = template.findOutputs('TaskTopicArn');
      expect(outputs).toHaveProperty('TaskTopicArn');
      expect(outputs.TaskTopicArn.Export.Name).toBe('smp-pubsub-task-service-task-topic-arn-dev');
    });

    it('should output correct topic ARN description', () => {
      template.hasOutput('TaskTopicArn', {
        Description: 'The ARN of the Task SNS topic',
      });
    });

    it('should provide access to taskTopic property', () => {
      expect(stack.taskTopic).toBeDefined();
      expect(stack.taskTopic.topicArn).toBeDefined();
    });
  });

  describe('prd environment', () => {
    let template: Template;
    let stack: SnsStack;

    beforeAll(() => {
      const testApp = new cdk.App();
      stack = new SnsStack(testApp, 'TestSnsStack', {
        appName: 'smp-pubsub-task-service',
        envName: 'prd',
      });
      template = Template.fromStack(stack);
    });

    it('should create Task SNS topic with prd naming', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'smp-pubsub-task-service-task-prd',
      });
    });

    it('should export topic ARN with prd environment in export name', () => {
      const outputs = template.findOutputs('TaskTopicArn');
      expect(outputs.TaskTopicArn.Export.Name).toBe('smp-pubsub-task-service-task-topic-arn-prd');
    });
  });

  describe('qat environment', () => {
    let template: Template;

    beforeAll(() => {
      const testApp = new cdk.App();
      const stack = new SnsStack(testApp, 'TestSnsStack', {
        appName: 'smp-pubsub-task-service',
        envName: 'qat',
      });
      template = Template.fromStack(stack);
    });

    it('should create Task SNS topic with qat naming', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'smp-pubsub-task-service-task-qat',
      });
    });

    it('should export topic ARN with qat environment in export name', () => {
      const outputs = template.findOutputs('TaskTopicArn');
      expect(outputs.TaskTopicArn.Export.Name).toBe('smp-pubsub-task-service-task-topic-arn-qat');
    });
  });

  describe('custom app names', () => {
    it('should create Topic with custom app name in naming', () => {
      const testApp = new cdk.App();
      const stack = new SnsStack(testApp, 'TestSnsStack', {
        appName: 'my-custom-app',
        envName: 'dev',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'my-custom-app-task-dev',
      });
    });

    it('should use custom app name in export name', () => {
      const testApp = new cdk.App();
      const stack = new SnsStack(testApp, 'TestSnsStack', {
        appName: 'my-custom-app',
        envName: 'dev',
      });
      const template = Template.fromStack(stack);

      const outputs = template.findOutputs('TaskTopicArn');
      expect(outputs.TaskTopicArn.Export.Name).toBe('my-custom-app-task-topic-arn-dev');
    });
  });

  describe('stack properties', () => {
    it('should support CDK StackProps configuration', () => {
      const testApp = new cdk.App();
      const stack = new SnsStack(testApp, 'TestSnsStack', {
        appName: 'smp-pubsub-task-service',
        envName: 'dev',
        env: {
          region: 'us-west-2',
        },
      });

      expect(stack.region).toBe('us-west-2');
    });
  });

  describe('topic permissions', () => {
    it('should create a topic that can be used for publishing', () => {
      const testApp = new cdk.App();
      const stack = new SnsStack(testApp, 'TestSnsStack', {
        appName: 'smp-pubsub-task-service',
        envName: 'dev',
      });

      // Verify the topic has the necessary properties for publishing
      expect(stack.taskTopic.topicArn).toBeDefined();
      expect(stack.taskTopic.topicName).toBeDefined();
    });
  });
});
