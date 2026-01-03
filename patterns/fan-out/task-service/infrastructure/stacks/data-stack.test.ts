import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DataStack } from './data-stack';

describe('DataStack', () => {
  describe('dev environment', () => {
    let template: Template;

    beforeAll(() => {
      const app = new cdk.App();
      const stack = new DataStack(app, 'TestDataStack', {
        appName: 'smp-fan-out-task-service',
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    it('should create a Task table', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'smp-fan-out-task-service-task-dev',
        BillingMode: 'PAY_PER_REQUEST',
        KeySchema: [
          {
            AttributeName: 'pk',
            KeyType: 'HASH',
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: 'pk',
            AttributeType: 'S',
          },
        ],
      });
    });

    it('should use DESTROY removal policy for dev', () => {
      template.hasResource('AWS::DynamoDB::Table', {
        DeletionPolicy: 'Delete',
      });
    });

    it('should not enable point-in-time recovery for dev', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: false,
        },
      });
    });

    it('should use AWS managed encryption', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true,
        },
      });
    });

    it('should export table name', () => {
      template.hasOutput('TaskTableName', {
        Export: {
          Name: 'smp-fan-out-task-service-task-table-name-dev',
        },
      });
    });

    it('should export table ARN', () => {
      template.hasOutput('TaskTableArn', {
        Export: {
          Name: 'smp-fan-out-task-service-task-table-arn-dev',
        },
      });
    });
  });

  describe('prd environment', () => {
    let template: Template;

    beforeAll(() => {
      const app = new cdk.App();
      const stack = new DataStack(app, 'TestDataStack', {
        appName: 'smp-fan-out-task-service',
        envName: 'prd',
      });
      template = Template.fromStack(stack);
    });

    it('should create a Task table with prd naming', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'smp-fan-out-task-service-task-prd',
      });
    });

    it('should use RETAIN removal policy for prd', () => {
      template.hasResource('AWS::DynamoDB::Table', {
        DeletionPolicy: 'Retain',
      });
    });

    it('should enable point-in-time recovery for prd', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });
    });
  });
});
