import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
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

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

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

    // Output the table name
    new cdk.CfnOutput(this, 'TaskTableName', {
      value: this.taskTable.tableName,
      description: 'The name of the Task DynamoDB table',
      exportName: `${props.appName}-task-table-name-${props.envName}`,
    });

    // Output the table ARN
    new cdk.CfnOutput(this, 'TaskTableArn', {
      value: this.taskTable.tableArn,
      description: 'The ARN of the Task DynamoDB table',
      exportName: `${props.appName}-task-table-arn-${props.envName}`,
    });

    // Output the bucket name
    new cdk.CfnOutput(this, 'TaskUploadsBucketName', {
      value: this.taskUploadsBucket.bucketName,
      description: 'The name of the Task Uploads S3 bucket',
      exportName: `${props.appName}-task-uploads-bucket-name-${props.envName}`,
    });

    // Output the bucket ARN
    new cdk.CfnOutput(this, 'TaskUploadsBucketArn', {
      value: this.taskUploadsBucket.bucketArn,
      description: 'The ARN of the Task Uploads S3 bucket',
      exportName: `${props.appName}-task-uploads-bucket-arn-${props.envName}`,
    });

    // Output the queue URL
    new cdk.CfnOutput(this, 'TaskUploadQueueUrl', {
      value: this.taskUploadQueue.queueUrl,
      description: 'The URL of the Task Upload Queue',
      exportName: `${props.appName}-task-upload-queue-url-${props.envName}`,
    });

    // Output the queue ARN
    new cdk.CfnOutput(this, 'TaskUploadQueueArn', {
      value: this.taskUploadQueue.queueArn,
      description: 'The ARN of the Task Upload Queue',
      exportName: `${props.appName}-task-upload-queue-arn-${props.envName}`,
    });

    // Output the DLQ URL
    new cdk.CfnOutput(this, 'TaskUploadDLQUrl', {
      value: this.taskUploadDLQ.queueUrl,
      description: 'The URL of the Task Upload Dead Letter Queue',
      exportName: `${props.appName}-task-upload-dlq-url-${props.envName}`,
    });

    // Output the DLQ ARN
    new cdk.CfnOutput(this, 'TaskUploadDLQArn', {
      value: this.taskUploadDLQ.queueArn,
      description: 'The ARN of the Task Upload Dead Letter Queue',
      exportName: `${props.appName}-task-upload-dlq-arn-${props.envName}`,
    });
  }
}
