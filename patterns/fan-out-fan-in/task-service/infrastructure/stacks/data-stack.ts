import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
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
 * CDK Stack for data resources including DynamoDB tables.
 */
export class DataStack extends cdk.Stack {
  /**
   * The Task DynamoDB table.
   */
  public readonly taskTable: dynamodb.ITable;

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
  }
}
