import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
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
}

/**
 * CDK Stack for Lambda authorizer function.
 * The authorizer function is exported and used by other services that need authentication.
 */
export class LambdaStack extends cdk.Stack {
  /**
   * The authorization Lambda function (token authorizer).
   */
  public readonly authorizerFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Create the authorization Lambda function
    this.authorizerFunction = new NodejsFunction(this, 'TokenAuthorizerFunction', {
      functionName: `${props.appName}-token-authorizer-${props.envName}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../src/handlers/token-authorizer.ts'),
      environment: {
        LOGGING_ENABLED: props.loggingEnabled.toString(),
        LOGGING_LEVEL: props.loggingLevel,
        LOGGING_FORMAT: props.loggingFormat,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.DEBUG,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      logGroup: new logs.LogGroup(this, 'TokenAuthorizerFunctionLogGroup', {
        logGroupName: `/aws/lambda/${props.appName}-token-authorizer-${props.envName}`,
        retention: props.envName === 'prd' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
        removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant API Gateway permission to invoke this Lambda function
    // This is required for cross-stack TokenAuthorizer usage
    this.authorizerFunction.addPermission('ApiGatewayInvokePermission', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:*/*/*/*`,
    });

    // Output the authorizer function ARN for use by other stacks (e.g., task-service)
    new cdk.CfnOutput(this, 'AuthorizerFunctionArn', {
      value: this.authorizerFunction.functionArn,
      description: 'ARN of the Lambda authorizer function',
      exportName: `${props.appName}-authorizer-function-arn-${props.envName}`,
    });
  }
}
