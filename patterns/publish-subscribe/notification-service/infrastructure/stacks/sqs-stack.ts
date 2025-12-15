import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

/**
 * Properties for the SqsStack.
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

  /**
   * The ARN of the Task SNS topic to subscribe to.
   */
  taskTopicArn: string;
}

/**
 * CDK Stack for SQS queues used for event consumption.
 */
export class SqsStack extends cdk.Stack {
  /**
   * The Notification Queue for polling messages.
   */
  public readonly notificationQueue: sqs.Queue;

  /**
   * The Dead Letter Queue for the Notification Queue.
   */
  public readonly notificationQueueDlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: SqsStackProps) {
    super(scope, id, props);

    // Create the Dead Letter Queue for the Notification Queue
    this.notificationQueueDlq = new sqs.Queue(this, 'NotificationQueueDLQ', {
      queueName: `${props.appName}-notification-dlq-${props.envName}`,
      retentionPeriod: cdk.Duration.days(14),
      removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Create the Notification Queue with redrive policy to DLQ
    this.notificationQueue = new sqs.Queue(this, 'NotificationQueue', {
      queueName: `${props.appName}-notification-${props.envName}`,
      visibilityTimeout: cdk.Duration.minutes(1),
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: this.notificationQueueDlq,
        maxReceiveCount: 3,
      },
      removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Subscribe the Notification Queue to the Task SNS topic
    const taskTopic = sns.Topic.fromTopicArn(this, 'TaskTopic', props.taskTopicArn);
    taskTopic.addSubscription(
      new subscriptions.SqsSubscription(this.notificationQueue, {
        rawMessageDelivery: true,
      }),
    );

    // Output the Notification Queue ARN
    new cdk.CfnOutput(this, 'NotificationQueueArn', {
      value: this.notificationQueue.queueArn,
      description: 'ARN of the notification queue',
      exportName: `${props.appName}-notification-queue-arn-${props.envName}`,
    });

    // Output the Notification Queue URL
    new cdk.CfnOutput(this, 'NotificationQueueUrl', {
      value: this.notificationQueue.queueUrl,
      description: 'URL of the notification queue',
      exportName: `${props.appName}-notification-queue-url-${props.envName}`,
    });

    // Output the Dead Letter Queue ARN
    new cdk.CfnOutput(this, 'NotificationQueueDLQArn', {
      value: this.notificationQueueDlq.queueArn,
      description: 'ARN of the notification queue Dead Letter Queue',
      exportName: `${props.appName}-notification-dlq-arn-${props.envName}`,
    });

    // Output the Dead Letter Queue URL
    new cdk.CfnOutput(this, 'NotificationQueueDLQUrl', {
      value: this.notificationQueueDlq.queueUrl,
      description: 'URL of the notification queue Dead Letter Queue',
      exportName: `${props.appName}-notification-dlq-url-${props.envName}`,
    });
  }
}
