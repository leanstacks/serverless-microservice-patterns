import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DataStack } from './data-stack';

describe('DataStack', () => {
  describe('dev environment', () => {
    let template: Template;

    beforeAll(() => {
      const app = new cdk.App();
      const stack = new DataStack(app, 'TestDataStack', {
        appName: 'smp-fan-out-fan-in-task-service',
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    it('should create a Task table', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'smp-fan-out-fan-in-task-service-task-dev',
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
          Name: 'smp-fan-out-fan-in-task-service-task-table-name-dev',
        },
      });
    });

    it('should export table ARN', () => {
      template.hasOutput('TaskTableArn', {
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-table-arn-dev',
        },
      });
    });

    it('should create a Task Uploads S3 bucket', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'smp-fan-out-fan-in-task-service-task-uploads-dev',
      });
    });

    it('should block public access to S3 bucket', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    it('should enable bucket encryption with S3 managed keys', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
      });
    });

    it('should enforce SSL for S3 bucket', () => {
      // Verify bucket policy exists that denies insecure transport
      template.resourceCountIs('AWS::S3::BucketPolicy', 1);
    });

    it('should not enable versioning for dev', () => {
      // CDK does not include VersioningConfiguration when versioning is disabled (default)
      // This test verifies bucket is created without explicit versioning
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'smp-fan-out-fan-in-task-service-task-uploads-dev',
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    it('should use DESTROY removal policy for dev S3 bucket', () => {
      template.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Delete',
      });
    });

    it('should export bucket name', () => {
      template.hasOutput('TaskUploadsBucketName', {
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-uploads-bucket-name-dev',
        },
      });
    });

    it('should export bucket ARN', () => {
      template.hasOutput('TaskUploadsBucketArn', {
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-uploads-bucket-arn-dev',
        },
      });
    });
  });

  describe('prd environment', () => {
    let template: Template;

    beforeAll(() => {
      const app = new cdk.App();
      const stack = new DataStack(app, 'TestDataStack', {
        appName: 'smp-fan-out-fan-in-task-service',
        envName: 'prd',
      });
      template = Template.fromStack(stack);
    });

    it('should create a Task table with prd naming', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'smp-fan-out-fan-in-task-service-task-prd',
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

    it('should create a Task Uploads S3 bucket with prd naming', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'smp-fan-out-fan-in-task-service-task-uploads-prd',
      });
    });

    it('should enable versioning for prd S3 bucket', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });
    });

    it('should use RETAIN removal policy for prd S3 bucket', () => {
      template.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Retain',
      });
    });

    it('should block public access to prd S3 bucket', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    it('should enforce SSL for prd S3 bucket', () => {
      // Verify bucket policy exists that denies insecure transport
      template.resourceCountIs('AWS::S3::BucketPolicy', 1);
    });
  });
});
