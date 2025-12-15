import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

/**
 * Properties for the SnsStack.
 */
export interface SnsStackProps extends cdk.StackProps {
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
 * CDK Stack for SNS topics used for event publishing.
 */
export class SnsStack extends cdk.Stack {
  /**
   * The Task SNS topic used to publish task-related events.
   */
  public readonly taskTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: SnsStackProps) {
    super(scope, id, props);

    // Create the Task SNS topic
    this.taskTopic = new sns.Topic(this, 'TaskTopic', {
      topicName: `${props.appName}-task-${props.envName}`,
      displayName: 'Task Service Events Topic',
      fifo: false,
    });

    // Output the topic ARN
    new cdk.CfnOutput(this, 'TaskTopicArn', {
      value: this.taskTopic.topicArn,
      description: 'The ARN of the Task SNS topic',
      exportName: `${props.appName}-task-topic-arn-${props.envName}`,
    });

    // Output the topic URL
    new cdk.CfnOutput(this, 'TaskTopicName', {
      value: this.taskTopic.topicName,
      description: 'The name of the Task SNS topic',
      exportName: `${props.appName}-task-topic-name-${props.envName}`,
    });
  }
}
