import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

/**
 * Properties for the LambdaStack.
 */
export interface LambdaStackProps extends cdk.StackProps {
  /**
   * Application name.
   */
  appName: string;

  /**
   * Environment name (dev, qat, prd).
   */
  envName: string;

  /**
   * Whether to enable application logging.
   */
  loggingEnabled: boolean;

  /**
   * Application logging level.
   */
  loggingLevel: string;

  /**
   * Application logging format (text or json).
   */
  loggingFormat: string;

  /**
   * The Notification Queue to subscribe to.
   */
  notificationQueue: sqs.IQueue;
}

/**
 * CDK Stack for Lambda functions.
 */
export class LambdaStack extends cdk.Stack {
  /**
   * The send notification Lambda function.
   */
  public readonly sendNotificationFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Create the send notification Lambda function
    this.sendNotificationFunction = new NodejsFunction(this, 'SendNotificationFunction', {
      functionName: `${props.appName}-send-notification-${props.envName}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../src/handlers/send-notification.ts'),
      environment: {
        LOGGING_ENABLED: props.loggingEnabled.toString(),
        LOGGING_LEVEL: props.loggingLevel,
        LOGGING_FORMAT: props.loggingFormat,
      },
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      logGroup: new logs.LogGroup(this, 'SendNotificationFunctionLogGroup', {
        logGroupName: `/aws/lambda/${props.appName}-send-notification-${props.envName}`,
        retention: props.envName === 'prd' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
        removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Add SQS event source to Lambda function
    this.sendNotificationFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(props.notificationQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(30),
        reportBatchItemFailures: true,
      }),
    );

    // Output the function ARN
    new cdk.CfnOutput(this, 'SendNotificationFunctionArn', {
      value: this.sendNotificationFunction.functionArn,
      description: 'ARN of the send notification Lambda function',
      exportName: `${props.appName}-send-notification-function-arn-${props.envName}`,
    });

    // Output the function name
    new cdk.CfnOutput(this, 'SendNotificationFunctionName', {
      value: this.sendNotificationFunction.functionName,
      description: 'Name of the send notification Lambda function',
      exportName: `${props.appName}-send-notification-function-name-${props.envName}`,
    });
  }
}
