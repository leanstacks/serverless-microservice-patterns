import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
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
}

/**
 * CDK Stack for Lambda authorizer function and API Gateway.
 */
export class LambdaStack extends cdk.Stack {
  /**
   * The API Gateway REST API.
   */
  public readonly api: apigateway.RestApi;

  /**
   * The authorization Lambda function (token authorizer).
   */
  public readonly authorizerFunction: NodejsFunction;

  /**
   * The API Gateway Lambda token authorizer.
   */
  public readonly authorizer: apigateway.TokenAuthorizer;

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
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      logGroup: new logs.LogGroup(this, 'TokenAuthorizerFunctionLogGroup', {
        logGroupName: `/aws/lambda/${props.appName}-token-authorizer-${props.envName}`,
        retention: props.envName === 'prd' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
        removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Create API Gateway Token Authorizer
    this.authorizer = new apigateway.TokenAuthorizer(this, 'LambdaTokenAuthorizer', {
      handler: this.authorizerFunction,
      identitySource: 'method.request.header.Authorization',
      resultsCacheTtl: cdk.Duration.seconds(300),
    });

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'GatekeeperApi', {
      restApiName: `${props.appName}-api-${props.envName}`,
      description: `Gatekeeper API with Lambda authorizer for ${props.envName} environment`,
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

    // Add a catch-all method to the root resource that requires authorization
    // This attaches the authorizer to the API, satisfying CDK validation
    this.api.root.addMethod('ANY', new apigateway.MockIntegration(), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'URL of the Gatekeeper API',
      exportName: `${props.appName}-api-url-${props.envName}`,
    });

    // Output the API Gateway ID
    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'ID of the Gatekeeper API',
      exportName: `${props.appName}-api-id-${props.envName}`,
    });

    // Output the API Gateway root resource ID (needed for cross-stack reference)
    new cdk.CfnOutput(this, 'ApiRootResourceId', {
      value: this.api.root.resourceId,
      description: 'Root resource ID of the Gatekeeper API',
      exportName: `${props.appName}-api-root-resource-id-${props.envName}`,
    });

    // Output the authorizer function ARN
    new cdk.CfnOutput(this, 'AuthorizerFunctionArn', {
      value: this.authorizerFunction.functionArn,
      description: 'ARN of the Lambda authorizer function',
      exportName: `${props.appName}-authorizer-function-arn-${props.envName}`,
    });

    // Output the authorizer ID
    new cdk.CfnOutput(this, 'AuthorizerId', {
      value: this.authorizer.authorizerId,
      description: 'ID of the API Gateway authorizer',
      exportName: `${props.appName}-authorizer-id-${props.envName}`,
    });
  }
}
