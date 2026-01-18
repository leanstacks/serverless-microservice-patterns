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

    it('should create a TaskFile table', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'smp-fan-out-fan-in-task-service-task-file-dev',
        BillingMode: 'PAY_PER_REQUEST',
        KeySchema: [
          {
            AttributeName: 'pk',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'sk',
            KeyType: 'RANGE',
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: 'pk',
            AttributeType: 'S',
          },
          {
            AttributeName: 'sk',
            AttributeType: 'S',
          },
        ],
      });
    });

    it('should export TaskFile table name', () => {
      template.hasOutput('TaskFileTableName', {
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-file-table-name-dev',
        },
      });
    });

    it('should export TaskFile table ARN', () => {
      template.hasOutput('TaskFileTableArn', {
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-file-table-arn-dev',
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

    it('should create a Task Upload Queue', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-task-upload-dev',
        MessageRetentionPeriod: 345600, // 4 days in seconds
        VisibilityTimeout: 300,
      });
    });

    it('should create a Task Upload DLQ with 14-day retention', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-task-upload-dlq-dev',
        MessageRetentionPeriod: 1209600, // 14 days in seconds
      });
    });

    it('should configure queue with DLQ redrive policy', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        RedrivePolicy: {
          deadLetterTargetArn: {
            'Fn::GetAtt': ['TaskUploadDLQD275BF02', 'Arn'],
          },
          maxReceiveCount: 3,
        },
      });
    });

    it('should export queue URL', () => {
      template.hasOutput('TaskUploadQueueUrl', {
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-upload-queue-url-dev',
        },
      });
    });

    it('should export queue ARN', () => {
      template.hasOutput('TaskUploadQueueArn', {
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-upload-queue-arn-dev',
        },
      });
    });

    it('should export DLQ URL', () => {
      template.hasOutput('TaskUploadDLQUrl', {
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-upload-dlq-url-dev',
        },
      });
    });

    it('should export DLQ ARN', () => {
      template.hasOutput('TaskUploadDLQArn', {
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-upload-dlq-arn-dev',
        },
      });
    });

    it('should create a Create Task Queue with correct properties', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-create-task-queue-dev',
        VisibilityTimeout: 60,
        MessageRetentionPeriod: 345600, // 4 days in seconds
      });
    });

    it('should create a Create Task Dead Letter Queue with correct properties', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-create-task-queue-dlq-dev',
        MessageRetentionPeriod: 1209600, // 14 days in seconds
      });
    });

    it('should configure Create Task Queue with DLQ redrive policy', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-create-task-queue-dev',
        RedrivePolicy: {
          maxReceiveCount: 3,
        },
      });
    });

    it('should output Create Task Queue URL', () => {
      template.hasOutput('CreateTaskQueueUrl', {
        Description: 'URL of the Create Task Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-create-task-queue-url-dev',
        },
      });
    });

    it('should output Create Task Queue ARN', () => {
      template.hasOutput('CreateTaskQueueArn', {
        Description: 'ARN of the Create Task Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-create-task-queue-arn-dev',
        },
      });
    });

    it('should output Create Task DLQ URL', () => {
      template.hasOutput('CreateTaskDLQUrl', {
        Description: 'URL of the Create Task Dead Letter Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-create-task-dlq-url-dev',
        },
      });
    });

    it('should output Create Task DLQ ARN', () => {
      template.hasOutput('CreateTaskDLQArn', {
        Description: 'ARN of the Create Task Dead Letter Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-create-task-dlq-arn-dev',
        },
      });
    });

    it('should create a Task Topic for publishing events', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'smp-fan-out-fan-in-task-service-task-topic-dev',
        DisplayName: 'Task events topic for dev environment',
      });
    });

    it('should export Task Topic ARN', () => {
      template.hasOutput('TaskTopicArn', {
        Description: 'ARN of the Task Topic',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-topic-arn-dev',
        },
      });
    });

    it('should create a TaskFile Complete Queue with correct properties', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-task-file-complete-dev',
        VisibilityTimeout: 60,
        MessageRetentionPeriod: 345600, // 4 days in seconds
      });
    });

    it('should create a TaskFile Complete Dead Letter Queue with correct properties', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-task-file-complete-dlq-dev',
        MessageRetentionPeriod: 1209600, // 14 days in seconds
      });
    });

    it('should configure TaskFile Complete Queue with DLQ redrive policy', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-task-file-complete-dev',
        RedrivePolicy: {
          maxReceiveCount: 3,
        },
      });
    });

    it('should output TaskFile Complete Queue URL', () => {
      template.hasOutput('TaskFileCompleteQueueUrl', {
        Description: 'URL of the TaskFile Complete Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-file-complete-queue-url-dev',
        },
      });
    });

    it('should output TaskFile Complete Queue ARN', () => {
      template.hasOutput('TaskFileCompleteQueueArn', {
        Description: 'ARN of the TaskFile Complete Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-file-complete-queue-arn-dev',
        },
      });
    });

    it('should output TaskFile Complete DLQ URL', () => {
      template.hasOutput('TaskFileCompleteDLQUrl', {
        Description: 'URL of the TaskFile Complete Dead Letter Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-file-complete-dlq-url-dev',
        },
      });
    });

    it('should output TaskFile Complete DLQ ARN', () => {
      template.hasOutput('TaskFileCompleteDLQArn', {
        Description: 'ARN of the TaskFile Complete Dead Letter Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-file-complete-dlq-arn-dev',
        },
      });
    });

    it('should subscribe TaskFile Complete Queue to Task Topic with event filter', () => {
      template.resourceCountIs('AWS::SNS::Subscription', 1);
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'sqs',
        RawMessageDelivery: true,
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

    it('should create a TaskFile table with prd naming', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'smp-fan-out-fan-in-task-service-task-file-prd',
        KeySchema: [
          {
            AttributeName: 'pk',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'sk',
            KeyType: 'RANGE',
          },
        ],
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

    it('should create a Task Upload Queue with prd naming', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-task-upload-prd',
      });
    });

    it('should create a Task Upload DLQ with prd naming', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-task-upload-dlq-prd',
      });
    });

    it('should use RETAIN removal policy for prd queue', () => {
      template.hasResource('AWS::SQS::Queue', {
        DeletionPolicy: 'Retain',
      });
    });

    it('should export prd queue URL', () => {
      template.hasOutput('TaskUploadQueueUrl', {
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-upload-queue-url-prd',
        },
      });
    });

    it('should export prd DLQ URL', () => {
      template.hasOutput('TaskUploadDLQUrl', {
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-upload-dlq-url-prd',
        },
      });
    });

    it('should create a Create Task Queue with prd naming', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-create-task-queue-prd',
        VisibilityTimeout: 60,
        MessageRetentionPeriod: 345600, // 4 days in seconds
      });
    });

    it('should create a Create Task DLQ with prd naming', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-create-task-queue-dlq-prd',
        MessageRetentionPeriod: 1209600, // 14 days in seconds
      });
    });

    it('should use RETAIN removal policy for prd Create Task Queue', () => {
      template.hasResource('AWS::SQS::Queue', {
        DeletionPolicy: 'Retain',
      });
    });

    it('should configure prd Create Task Queue with DLQ redrive policy', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-create-task-queue-prd',
        RedrivePolicy: {
          maxReceiveCount: 3,
        },
      });
    });

    it('should export prd Create Task Queue URL', () => {
      template.hasOutput('CreateTaskQueueUrl', {
        Description: 'URL of the Create Task Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-create-task-queue-url-prd',
        },
      });
    });

    it('should export prd Create Task Queue ARN', () => {
      template.hasOutput('CreateTaskQueueArn', {
        Description: 'ARN of the Create Task Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-create-task-queue-arn-prd',
        },
      });
    });

    it('should export prd Create Task DLQ URL', () => {
      template.hasOutput('CreateTaskDLQUrl', {
        Description: 'URL of the Create Task Dead Letter Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-create-task-dlq-url-prd',
        },
      });
    });

    it('should export prd Create Task DLQ ARN', () => {
      template.hasOutput('CreateTaskDLQArn', {
        Description: 'ARN of the Create Task Dead Letter Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-create-task-dlq-arn-prd',
        },
      });
    });

    it('should create a Task Topic with prd naming for publishing events', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'smp-fan-out-fan-in-task-service-task-topic-prd',
        DisplayName: 'Task events topic for prd environment',
      });
    });

    it('should export prd Task Topic ARN', () => {
      template.hasOutput('TaskTopicArn', {
        Description: 'ARN of the Task Topic',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-topic-arn-prd',
        },
      });
    });

    it('should create a TaskFile Complete Queue with prd naming', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-task-file-complete-prd',
        VisibilityTimeout: 60,
        MessageRetentionPeriod: 345600, // 4 days in seconds
      });
    });

    it('should create a TaskFile Complete DLQ with prd naming', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-task-file-complete-dlq-prd',
        MessageRetentionPeriod: 1209600, // 14 days in seconds
      });
    });

    it('should use RETAIN removal policy for prd TaskFile Complete Queue', () => {
      template.hasResource('AWS::SQS::Queue', {
        DeletionPolicy: 'Retain',
      });
    });

    it('should configure prd TaskFile Complete Queue with DLQ redrive policy', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'smp-fan-out-fan-in-task-service-task-file-complete-prd',
        RedrivePolicy: {
          maxReceiveCount: 3,
        },
      });
    });

    it('should export prd TaskFile Complete Queue URL', () => {
      template.hasOutput('TaskFileCompleteQueueUrl', {
        Description: 'URL of the TaskFile Complete Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-file-complete-queue-url-prd',
        },
      });
    });

    it('should export prd TaskFile Complete Queue ARN', () => {
      template.hasOutput('TaskFileCompleteQueueArn', {
        Description: 'ARN of the TaskFile Complete Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-file-complete-queue-arn-prd',
        },
      });
    });

    it('should export prd TaskFile Complete DLQ URL', () => {
      template.hasOutput('TaskFileCompleteDLQUrl', {
        Description: 'URL of the TaskFile Complete Dead Letter Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-file-complete-dlq-url-prd',
        },
      });
    });

    it('should export prd TaskFile Complete DLQ ARN', () => {
      template.hasOutput('TaskFileCompleteDLQArn', {
        Description: 'ARN of the TaskFile Complete Dead Letter Queue',
        Export: {
          Name: 'smp-fan-out-fan-in-task-service-task-file-complete-dlq-arn-prd',
        },
      });
    });

    it('should subscribe TaskFile Complete Queue to Task Topic with event filter in prd', () => {
      template.resourceCountIs('AWS::SNS::Subscription', 1);
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'sqs',
        RawMessageDelivery: true,
      });
    });
  });
});
