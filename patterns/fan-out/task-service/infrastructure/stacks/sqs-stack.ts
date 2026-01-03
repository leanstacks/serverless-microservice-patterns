import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

/**
 * Properties for the SQS Stack.
 */
export interface SqsStackProps extends cdk.StackProps {
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
 * CDK Stack for SQS queues.
 */
export class SqsStack extends cdk.Stack {
  /**
   * The Create Task SQS queue.
   */
  public readonly createTaskQueue: sqs.Queue;

  /**
   * The Dead Letter Queue for the Create Task queue.
   */
  public readonly createTaskDLQ: sqs.Queue;

  constructor(scope: Construct, id: string, props: SqsStackProps) {
    super(scope, id, props);

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
      retentionPeriod: cdk.Duration.days(14),
      deadLetterQueue: {
        queue: this.createTaskDLQ,
        maxReceiveCount: 3,
      },
      removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Note: RedriveAllowPolicy is not configured to avoid circular dependency.
    // Messages can still be manually redriven from the DLQ to the main queue via the AWS Console.

    // Output the queue URL
    new cdk.CfnOutput(this, 'CreateTaskQueueUrl', {
      value: this.createTaskQueue.queueUrl,
      description: 'URL of the Create Task Queue',
      exportName: `${props.appName}-create-task-queue-url-${props.envName}`,
    });

    // Output the queue ARN
    new cdk.CfnOutput(this, 'CreateTaskQueueArn', {
      value: this.createTaskQueue.queueArn,
      description: 'ARN of the Create Task Queue',
      exportName: `${props.appName}-create-task-queue-arn-${props.envName}`,
    });

    // Output the DLQ URL
    new cdk.CfnOutput(this, 'CreateTaskDLQUrl', {
      value: this.createTaskDLQ.queueUrl,
      description: 'URL of the Create Task Dead Letter Queue',
      exportName: `${props.appName}-create-task-dlq-url-${props.envName}`,
    });

    // Output the DLQ ARN
    new cdk.CfnOutput(this, 'CreateTaskDLQArn', {
      value: this.createTaskDLQ.queueArn,
      description: 'ARN of the Create Task Dead Letter Queue',
      exportName: `${props.appName}-create-task-dlq-arn-${props.envName}`,
    });
  }
}
