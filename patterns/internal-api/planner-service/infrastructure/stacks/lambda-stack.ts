import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
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

  /**
   * CORS allow origin value.
   */
  corsAllowOrigin: string;

  /**
   * Name of the task service list tasks Lambda function.
   */
  listTasksFunctionName: string;
}

/**
 * CDK Stack for Lambda functions and API Gateway.
 */
export class LambdaStack extends cdk.Stack {
  /**
   * The API Gateway REST API.
   */
  public readonly api: apigateway.RestApi;

  /**
   * The daily planner Lambda function.
   */
  public readonly dailyPlannerFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Create the daily planner Lambda function
    this.dailyPlannerFunction = new NodejsFunction(this, 'DailyPlannerFunction', {
      functionName: `${props.appName}-daily-planner-${props.envName}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../src/handlers/daily-planner.ts'),
      environment: {
        LOGGING_ENABLED: props.loggingEnabled.toString(),
        LOGGING_LEVEL: props.loggingLevel,
        LOGGING_FORMAT: props.loggingFormat,
        CORS_ALLOW_ORIGIN: props.corsAllowOrigin,
        LIST_TASKS_FUNCTION_NAME: props.listTasksFunctionName,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      logGroup: new logs.LogGroup(this, 'DailyPlannerFunctionLogGroup', {
        logGroupName: `/aws/lambda/${props.appName}-daily-planner-${props.envName}`,
        retention: props.envName === 'prd' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
        removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant the Daily Planner Lambda function permission to invoke the task service's list tasks function
    this.dailyPlannerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [`arn:aws:lambda:${this.region}:${this.account}:function:${props.listTasksFunctionName}`],
      }),
    );

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'DailyPlannerApi', {
      restApiName: `${props.appName}-api-${props.envName}`,
      description: `Daily Planner API for ${props.envName} environment`,
      deployOptions: {
        stageName: props.envName,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [props.corsAllowOrigin],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Create /planner resource
    const plannerResource = this.api.root.addResource('planner');

    // Create /planner/daily resource
    const dailyResource = plannerResource.addResource('daily');

    // Add GET method to /planner/daily
    dailyResource.addMethod('GET', new apigateway.LambdaIntegration(this.dailyPlannerFunction));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'URL of the Daily Planner API',
      exportName: `${props.appName}-daily-planner-api-url-${props.envName}`,
    });

    // Output the API Gateway ID
    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'ID of the Daily Planner API',
      exportName: `${props.appName}-daily-planner-api-id-${props.envName}`,
    });

    // Output the daily planner function ARN
    new cdk.CfnOutput(this, 'DailyPlannerFunctionArn', {
      value: this.dailyPlannerFunction.functionArn,
      description: 'ARN of the daily planner Lambda function',
      exportName: `${props.appName}-daily-planner-function-arn-${props.envName}`,
    });
  }
}
