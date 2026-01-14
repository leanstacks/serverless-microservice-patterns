import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
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
   * Reference to the Task DynamoDB table.
   */
  taskTable: dynamodb.ITable;

  /**
   * Reference to the TaskFile DynamoDB table.
   */
  taskFileTable: dynamodb.ITable;

  /**
   * Reference to the Create Task SQS queue.
   */
  createTaskQueue: sqs.IQueue;

  /**
   * Reference to the Task Upload SQS queue.
   */
  taskUploadQueue: sqs.IQueue;

  /**
   * Reference to the Task Uploads S3 bucket.
   */
  taskUploadsBucket: s3.IBucket;

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
 * CDK Stack for Lambda functions and API Gateway.
 */
export class LambdaStack extends cdk.Stack {
  /**
   * The API Gateway REST API.
   */
  public readonly api: apigateway.RestApi;

  /**
   * The list tasks Lambda function.
   */
  public readonly listTasksFunction: NodejsFunction;

  /**
   * The daily planner Lambda function.
   */
  public readonly dailyPlannerFunction: NodejsFunction;

  /**
   * The get task Lambda function.
   */
  public readonly getTaskFunction: NodejsFunction;

  /**
   * The create task Lambda function.
   */
  public readonly createTaskFunction: NodejsFunction;

  /**
   * The update task Lambda function.
   */
  public readonly updateTaskFunction: NodejsFunction;

  /**
   * The delete task Lambda function.
   */
  public readonly deleteTaskFunction: NodejsFunction;

  /**
   * The upload CSV Lambda function.
   */
  public readonly uploadCsvFunction: NodejsFunction;

  /**
   * The create task subscriber Lambda function.
   */
  public readonly createTaskSubscriberFunction: NodejsFunction;

  /**
   * The upload task subscriber Lambda function.
   */
  public readonly uploadTaskSubscriberFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Common Lambda environment variables
    const lambdaEnvironment = {
      TASKS_TABLE: props.taskTable.tableName,
      TASK_FILE_TABLE: props.taskFileTable.tableName,
      CREATE_TASK_QUEUE_URL: props.createTaskQueue.queueUrl,
      TASK_UPLOADS_BUCKET: props.taskUploadsBucket.bucketName,
      LOGGING_ENABLED: props.loggingEnabled.toString(),
      LOGGING_LEVEL: props.loggingLevel,
      LOGGING_FORMAT: props.loggingFormat,
      CORS_ALLOW_ORIGIN: props.corsAllowOrigin,
    };

    // Create the list tasks Lambda function
    this.listTasksFunction = new NodejsFunction(this, 'ListTasksFunction', {
      functionName: `${props.appName}-list-tasks-${props.envName}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../src/handlers/list-tasks.ts'),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.DEBUG,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      logGroup: new logs.LogGroup(this, 'ListTasksFunctionLogGroup', {
        logGroupName: `/aws/lambda/${props.appName}-list-tasks-${props.envName}`,
        retention: props.envName === 'prd' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
        removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant the Lambda function read access to the DynamoDB table
    props.taskTable.grantReadData(this.listTasksFunction);

    // Create the get task Lambda function
    this.getTaskFunction = new NodejsFunction(this, 'GetTaskFunction', {
      functionName: `${props.appName}-get-task-${props.envName}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../src/handlers/get-task.ts'),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.DEBUG,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      logGroup: new logs.LogGroup(this, 'GetTaskFunctionLogGroup', {
        logGroupName: `/aws/lambda/${props.appName}-get-task-${props.envName}`,
        retention: props.envName === 'prd' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
        removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant the Lambda function read access to the DynamoDB table
    props.taskTable.grantReadData(this.getTaskFunction);

    // Create the create task Lambda function
    this.createTaskFunction = new NodejsFunction(this, 'CreateTaskFunction', {
      functionName: `${props.appName}-create-task-${props.envName}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../src/handlers/create-task.ts'),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.DEBUG,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      logGroup: new logs.LogGroup(this, 'CreateTaskFunctionLogGroup', {
        logGroupName: `/aws/lambda/${props.appName}-create-task-${props.envName}`,
        retention: props.envName === 'prd' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
        removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant the Lambda function write access to the DynamoDB table
    props.taskTable.grantWriteData(this.createTaskFunction);

    // Create the update task Lambda function
    this.updateTaskFunction = new NodejsFunction(this, 'UpdateTaskFunction', {
      functionName: `${props.appName}-update-task-${props.envName}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../src/handlers/update-task.ts'),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.DEBUG,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      logGroup: new logs.LogGroup(this, 'UpdateTaskFunctionLogGroup', {
        logGroupName: `/aws/lambda/${props.appName}-update-task-${props.envName}`,
        retention: props.envName === 'prd' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
        removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant the Lambda function read and write access to the DynamoDB table
    props.taskTable.grantReadWriteData(this.updateTaskFunction);

    // Create the delete task Lambda function
    this.deleteTaskFunction = new NodejsFunction(this, 'DeleteTaskFunction', {
      functionName: `${props.appName}-delete-task-${props.envName}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../src/handlers/delete-task.ts'),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.DEBUG,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      logGroup: new logs.LogGroup(this, 'DeleteTaskFunctionLogGroup', {
        logGroupName: `/aws/lambda/${props.appName}-delete-task-${props.envName}`,
        retention: props.envName === 'prd' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
        removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant the Lambda function read and write access to the DynamoDB table
    props.taskTable.grantReadWriteData(this.deleteTaskFunction);

    // Create the create task subscriber Lambda function
    this.createTaskSubscriberFunction = new NodejsFunction(this, 'CreateTaskSubscriberFunction', {
      functionName: `${props.appName}-create-task-subscriber-${props.envName}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../src/handlers/create-task-subscriber.ts'),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.DEBUG,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      logGroup: new logs.LogGroup(this, 'CreateTaskSubscriberFunctionLogGroup', {
        logGroupName: `/aws/lambda/${props.appName}-create-task-subscriber-${props.envName}`,
        retention: props.envName === 'prd' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
        removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant the Lambda function read and write access to the DynamoDB table
    props.taskTable.grantReadWriteData(this.createTaskSubscriberFunction);

    // Grant the Lambda function read and write access to the TaskFile DynamoDB table
    props.taskFileTable.grantReadWriteData(this.createTaskSubscriberFunction);

    // Add SQS event source to the Lambda function
    this.createTaskSubscriberFunction.addEventSource(
      new SqsEventSource(props.createTaskQueue, {
        maxConcurrency: 5,
        batchSize: 10,
        reportBatchItemFailures: true,
      }),
    );

    // Create the upload task subscriber Lambda function
    this.uploadTaskSubscriberFunction = new NodejsFunction(this, 'UploadTaskSubscriberFunction', {
      functionName: `${props.appName}-upload-task-subscriber-${props.envName}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../src/handlers/upload-task-subscriber.ts'),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.DEBUG,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      logGroup: new logs.LogGroup(this, 'UploadTaskSubscriberFunctionLogGroup', {
        logGroupName: `/aws/lambda/${props.appName}-upload-task-subscriber-${props.envName}`,
        retention: props.envName === 'prd' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
        removalPolicy: props.envName === 'prd' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant the Lambda function read and write access to the DynamoDB table
    props.taskTable.grantReadWriteData(this.uploadTaskSubscriberFunction);

    // Grant the Lambda function write access to the TaskFile DynamoDB table
    props.taskFileTable.grantWriteData(this.uploadTaskSubscriberFunction);

    // Grant the Lambda function read access to the S3 bucket
    props.taskUploadsBucket.grantRead(this.uploadTaskSubscriberFunction);

    // Grant the Lambda function send message access to the SQS queue
    props.createTaskQueue.grantSendMessages(this.uploadTaskSubscriberFunction);

    // Add SQS event source to the Lambda function
    this.uploadTaskSubscriberFunction.addEventSource(
      new SqsEventSource(props.taskUploadQueue, {
        maxConcurrency: 5,
        batchSize: 10,
        reportBatchItemFailures: true,
      }),
    );

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'LambdaStarterApi', {
      restApiName: `${props.appName}-api-${props.envName}`,
      description: `Lambda Starter API for ${props.envName} environment`,
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

    // Create /tasks resource
    const tasksResource = this.api.root.addResource('tasks');

    // Add GET method to /tasks
    tasksResource.addMethod('GET', new apigateway.LambdaIntegration(this.listTasksFunction));

    // Add POST method to /tasks
    tasksResource.addMethod('POST', new apigateway.LambdaIntegration(this.createTaskFunction));

    // Create /tasks/upload resource
    const uploadResource = tasksResource.addResource('upload');

    // Create an IAM role for API Gateway to put objects in S3
    const apiGatewayS3Role = new iam.Role(this, 'ApiGatewayS3Role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      description: 'Role for API Gateway to put objects in Task Uploads S3 bucket',
    });

    // Grant the role permission to put objects in the S3 bucket under /new prefix
    apiGatewayS3Role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject', 's3:PutObjectAcl'],
        resources: [`${props.taskUploadsBucket.bucketArn}/new/*`],
        effect: iam.Effect.ALLOW,
      }),
    );

    // Create S3 integration for the upload endpoint
    const s3Integration = new apigateway.AwsIntegration({
      service: 's3',
      region: this.region,
      path: `${props.taskUploadsBucket.bucketName}/new/{key}`,
      integrationHttpMethod: 'PUT',
      options: {
        credentialsRole: apiGatewayS3Role,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '{"message": "File uploaded successfully"}',
            },
          },
        ],
        requestParameters: {
          'integration.request.path.key': 'method.request.querystring.key',
        },
      },
    });

    // Add POST method to /tasks/upload with S3 integration
    uploadResource.addMethod('POST', s3Integration, {
      requestParameters: {
        'method.request.querystring.key': true,
      },
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
      ],
    });

    // Create /tasks/{taskId} resource
    const taskResource = tasksResource.addResource('{taskId}');

    // Add GET method to /tasks/{taskId}
    taskResource.addMethod('GET', new apigateway.LambdaIntegration(this.getTaskFunction));

    // Add PUT method to /tasks/{taskId}
    taskResource.addMethod('PUT', new apigateway.LambdaIntegration(this.updateTaskFunction));

    // Add DELETE method to /tasks/{taskId}
    taskResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.deleteTaskFunction));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'URL of the Tasks API',
      exportName: `${props.appName}-tasks-api-url-${props.envName}`,
    });

    // Output the API Gateway ID
    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'ID of the Tasks API',
      exportName: `${props.appName}-tasks-api-id-${props.envName}`,
    });

    // Output the list tasks function ARN
    new cdk.CfnOutput(this, 'ListTasksFunctionArn', {
      value: this.listTasksFunction.functionArn,
      description: 'ARN of the list tasks Lambda function',
      exportName: `${props.appName}-list-tasks-function-arn-${props.envName}`,
    });

    // Output the get task function ARN
    new cdk.CfnOutput(this, 'GetTaskFunctionArn', {
      value: this.getTaskFunction.functionArn,
      description: 'ARN of the get task Lambda function',
      exportName: `${props.appName}-get-task-function-arn-${props.envName}`,
    });

    // Output the create task function ARN
    new cdk.CfnOutput(this, 'CreateTaskFunctionArn', {
      value: this.createTaskFunction.functionArn,
      description: 'ARN of the create task Lambda function',
      exportName: `${props.appName}-create-task-function-arn-${props.envName}`,
    });

    // Output the update task function ARN
    new cdk.CfnOutput(this, 'UpdateTaskFunctionArn', {
      value: this.updateTaskFunction.functionArn,
      description: 'ARN of the update task Lambda function',
      exportName: `${props.appName}-update-task-function-arn-${props.envName}`,
    });

    // Output the delete task function ARN
    new cdk.CfnOutput(this, 'DeleteTaskFunctionArn', {
      value: this.deleteTaskFunction.functionArn,
      description: 'ARN of the delete task Lambda function',
      exportName: `${props.appName}-delete-task-function-arn-${props.envName}`,
    });

    // Output the create task subscriber function ARN
    new cdk.CfnOutput(this, 'CreateTaskSubscriberFunctionArn', {
      value: this.createTaskSubscriberFunction.functionArn,
      description: 'ARN of the create task subscriber Lambda function',
      exportName: `${props.appName}-create-task-subscriber-function-arn-${props.envName}`,
    });

    // Output the upload task subscriber function ARN
    new cdk.CfnOutput(this, 'UploadTaskSubscriberFunctionArn', {
      value: this.uploadTaskSubscriberFunction.functionArn,
      description: 'ARN of the upload task subscriber Lambda function',
      exportName: `${props.appName}-upload-task-subscriber-function-arn-${props.envName}`,
    });
  }
}
