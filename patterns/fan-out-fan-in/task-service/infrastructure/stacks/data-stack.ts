import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

/**
 * Properties for the DataStack.
 */
export interface DataStackProps extends cdk.StackProps {
  /**
   * Application name.
   */
  appName: string;

  /**
   * Environment name (dev, qat, prd).
   */
  envName: string;
}

/**
 * CDK Stack for data resources including DynamoDB tables and S3 buckets.
 */
export class DataStack extends cdk.Stack {
  /**
   * The Task DynamoDB table.
   */
  public readonly taskTable: dynamodb.ITable;

  /**
   * The TaskFile DynamoDB table.
   */
  public readonly taskFileTable: dynamodb.ITable;

  /**
   * The Task Uploads S3 bucket.
   */
  public readonly taskUploadsBucket: s3.IBucket;

  /**
   * The Task Upload Queue.
   */
  public readonly taskUploadQueue: sqs.IQueue;

  /**
   * The Task Upload Dead Letter Queue.
   */
  public readonly taskUploadDLQ: sqs.IQueue;

  /**
   * The Task Topic for publishing task events.
   */
  public readonly taskTopic: sns.Topic;

  /**
   * The Create Task SQS queue.
   */
  public readonly createTaskQueue: sqs.Queue;

  /**
   * The Dead Letter Queue for the Create Task queue.
   */
  public readonly createTaskDLQ: sqs.Queue;

  /**
   * The TaskFile Complete Queue.
   */
  public readonly taskFileCompleteQueue: sqs.Queue;

  /**
   * The Dead Letter Queue for the TaskFile Complete queue.
   */
  public readonly taskFileCompleteDLQ: sqs.Queue;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    // Task Topic for publishing task microservice events
    this.taskTopic = new sns.Topic(this, 'TaskTopic', {
      topicName: `${props.appName}-task-topic-${props.envName}`,
      displayName: `Task events topic for ${props.envName} environment`,
    });

    // Create Task table
    this.taskTable = new dynamodb.Table(this, 'TaskTable', {
      tableName: `${props.appName}-task-${props.envName}`,
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: props.envName === 'prd',
      },
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Create TaskFile table
    this.taskFileTable = new dynamodb.Table(this, 'TaskFileTable', {
      tableName: `${props.appName}-task-file-${props.envName}`,
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: props.envName === 'prd',
      },
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Create Task Uploads S3 bucket
    this.taskUploadsBucket = new s3.Bucket(this, 'TaskUploadsBucket', {
      bucketName: `${props.appName}-task-uploads-${props.envName}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: props.envName === 'prd',
      autoDeleteObjects: props.envName !== 'prd',
      removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Create Task Upload Dead Letter Queue
    this.taskUploadDLQ = new sqs.Queue(this, 'TaskUploadDLQ', {
      queueName: `${props.appName}-task-upload-dlq-${props.envName}`,
      retentionPeriod: cdk.Duration.days(14),
      removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Create Task Upload Queue
    this.taskUploadQueue = new sqs.Queue(this, 'TaskUploadQueue', {
      queueName: `${props.appName}-task-upload-${props.envName}`,
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(4),
      removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      deadLetterQueue: {
        queue: this.taskUploadDLQ,
        maxReceiveCount: 3,
      },
    });

    // Configure S3 bucket to publish ObjectCreated events to the queue
    this.taskUploadsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(this.taskUploadQueue),
    );

    // Create Dead Letter Queue for Create Task Queue
    this.createTaskDLQ = new sqs.Queue(this, 'CreateTaskDLQ', {
      queueName: `${props.appName}-create-task-queue-dlq-${props.envName}`,
      retentionPeriod: cdk.Duration.days(14),
      removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Create the Create Task Queue
    this.createTaskQueue = new sqs.Queue(this, 'CreateTaskQueue', {
      queueName: `${props.appName}-create-task-queue-${props.envName}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: this.createTaskDLQ,
        maxReceiveCount: 3,
      },
      removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Create Dead Letter Queue for TaskFile Complete Queue
    this.taskFileCompleteDLQ = new sqs.Queue(this, 'TaskFileCompleteDLQ', {
      queueName: `${props.appName}-task-file-complete-dlq-${props.envName}`,
      retentionPeriod: cdk.Duration.days(14),
      removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Create the TaskFile Complete Queue
    this.taskFileCompleteQueue = new sqs.Queue(this, 'TaskFileCompleteQueue', {
      queueName: `${props.appName}-task-file-complete-${props.envName}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: this.taskFileCompleteDLQ,
        maxReceiveCount: 3,
      },
      removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Subscribe the TaskFile Complete Queue to the Task Topic with event filtering
    this.taskTopic.addSubscription(
      new subscriptions.SqsSubscription(this.taskFileCompleteQueue, {
        filterPolicy: {
          event: sns.SubscriptionFilter.stringFilter({
            allowlist: ['taskfile_processing_complete'],
          }),
        },
        rawMessageDelivery: true,
      }),
    );

    // Output the Task table name
    new cdk.CfnOutput(this, 'TaskTableName', {
      value: this.taskTable.tableName,
      description: 'The name of the Task DynamoDB table',
      exportName: `${props.appName}-task-table-name-${props.envName}`,
    });

    // Output the Task table ARN
    new cdk.CfnOutput(this, 'TaskTableArn', {
      value: this.taskTable.tableArn,
      description: 'The ARN of the Task DynamoDB table',
      exportName: `${props.appName}-task-table-arn-${props.envName}`,
    });

    // Output the TaskFile table name
    new cdk.CfnOutput(this, 'TaskFileTableName', {
      value: this.taskFileTable.tableName,
      description: 'The name of the TaskFile DynamoDB table',
      exportName: `${props.appName}-task-file-table-name-${props.envName}`,
    });

    // Output the TaskFile table ARN
    new cdk.CfnOutput(this, 'TaskFileTableArn', {
      value: this.taskFileTable.tableArn,
      description: 'The ARN of the TaskFile DynamoDB table',
      exportName: `${props.appName}-task-file-table-arn-${props.envName}`,
    });

    // Output the Task Uploads bucket name
    new cdk.CfnOutput(this, 'TaskUploadsBucketName', {
      value: this.taskUploadsBucket.bucketName,
      description: 'The name of the Task Uploads S3 bucket',
      exportName: `${props.appName}-task-uploads-bucket-name-${props.envName}`,
    });

    // Output the Task Uploads bucket ARN
    new cdk.CfnOutput(this, 'TaskUploadsBucketArn', {
      value: this.taskUploadsBucket.bucketArn,
      description: 'The ARN of the Task Uploads S3 bucket',
      exportName: `${props.appName}-task-uploads-bucket-arn-${props.envName}`,
    });

    // Output the Task Upload queue URL
    new cdk.CfnOutput(this, 'TaskUploadQueueUrl', {
      value: this.taskUploadQueue.queueUrl,
      description: 'The URL of the Task Upload Queue',
      exportName: `${props.appName}-task-upload-queue-url-${props.envName}`,
    });

    // Output the Task Upload queue ARN
    new cdk.CfnOutput(this, 'TaskUploadQueueArn', {
      value: this.taskUploadQueue.queueArn,
      description: 'The ARN of the Task Upload Queue',
      exportName: `${props.appName}-task-upload-queue-arn-${props.envName}`,
    });

    // Output the Task Upload DLQ URL
    new cdk.CfnOutput(this, 'TaskUploadDLQUrl', {
      value: this.taskUploadDLQ.queueUrl,
      description: 'The URL of the Task Upload Dead Letter Queue',
      exportName: `${props.appName}-task-upload-dlq-url-${props.envName}`,
    });

    // Output the Task Upload DLQ ARN
    new cdk.CfnOutput(this, 'TaskUploadDLQArn', {
      value: this.taskUploadDLQ.queueArn,
      description: 'The ARN of the Task Upload Dead Letter Queue',
      exportName: `${props.appName}-task-upload-dlq-arn-${props.envName}`,
    });

    // Output the Create Task queue URL
    new cdk.CfnOutput(this, 'CreateTaskQueueUrl', {
      value: this.createTaskQueue.queueUrl,
      description: 'URL of the Create Task Queue',
      exportName: `${props.appName}-create-task-queue-url-${props.envName}`,
    });

    // Output the Create Task queue ARN
    new cdk.CfnOutput(this, 'CreateTaskQueueArn', {
      value: this.createTaskQueue.queueArn,
      description: 'ARN of the Create Task Queue',
      exportName: `${props.appName}-create-task-queue-arn-${props.envName}`,
    });

    // Output the Create Task DLQ URL
    new cdk.CfnOutput(this, 'CreateTaskDLQUrl', {
      value: this.createTaskDLQ.queueUrl,
      description: 'URL of the Create Task Dead Letter Queue',
      exportName: `${props.appName}-create-task-dlq-url-${props.envName}`,
    });

    // Output the Create Task DLQ ARN
    new cdk.CfnOutput(this, 'CreateTaskDLQArn', {
      value: this.createTaskDLQ.queueArn,
      description: 'ARN of the Create Task Dead Letter Queue',
      exportName: `${props.appName}-create-task-dlq-arn-${props.envName}`,
    });

    // Output the TaskFile Complete queue URL
    new cdk.CfnOutput(this, 'TaskFileCompleteQueueUrl', {
      value: this.taskFileCompleteQueue.queueUrl,
      description: 'URL of the TaskFile Complete Queue',
      exportName: `${props.appName}-task-file-complete-queue-url-${props.envName}`,
    });

    // Output the TaskFile Complete queue ARN
    new cdk.CfnOutput(this, 'TaskFileCompleteQueueArn', {
      value: this.taskFileCompleteQueue.queueArn,
      description: 'ARN of the TaskFile Complete Queue',
      exportName: `${props.appName}-task-file-complete-queue-arn-${props.envName}`,
    });

    // Output the TaskFile Complete DLQ URL
    new cdk.CfnOutput(this, 'TaskFileCompleteDLQUrl', {
      value: this.taskFileCompleteDLQ.queueUrl,
      description: 'URL of the TaskFile Complete Dead Letter Queue',
      exportName: `${props.appName}-task-file-complete-dlq-url-${props.envName}`,
    });

    // Output the TaskFile Complete DLQ ARN
    new cdk.CfnOutput(this, 'TaskFileCompleteDLQArn', {
      value: this.taskFileCompleteDLQ.queueArn,
      description: 'ARN of the TaskFile Complete Dead Letter Queue',
      exportName: `${props.appName}-task-file-complete-dlq-arn-${props.envName}`,
    });

    // Output the Task Topic ARN
    new cdk.CfnOutput(this, 'TaskTopicArn', {
      value: this.taskTopic.topicArn,
      description: 'ARN of the Task Topic',
      exportName: `${props.appName}-task-topic-arn-${props.envName}`,
    });
  }
}
