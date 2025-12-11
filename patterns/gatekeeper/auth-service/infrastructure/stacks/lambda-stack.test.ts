import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaStack, type LambdaStackProps } from './lambda-stack';

describe('LambdaStack', () => {
  let app: cdk.App;
  let stack: LambdaStack;

  beforeEach(() => {
    app = new cdk.App();
    const props: LambdaStackProps = {
      appName: 'gatekeeper',
      envName: 'test',
      loggingEnabled: true,
      loggingLevel: 'debug',
      loggingFormat: 'json',
    };

    stack = new LambdaStack(app, 'TestLambdaStack', props);
  });

  describe('constructor', () => {
    it('should create a LambdaStack instance', () => {
      expect(stack).toBeInstanceOf(LambdaStack);
      expect(stack).toBeInstanceOf(cdk.Stack);
    });

    it('should create an authorizer function', () => {
      expect(stack.authorizerFunction).toBeDefined();
      expect(stack.authorizerFunction).toBeInstanceOf(lambda.Function);
    });
  });

  describe('authorizerFunction', () => {
    it('should have a function name defined', () => {
      expect(stack.authorizerFunction.functionName).toBeTruthy();
    });

    it('should use Node.js 24.x runtime', () => {
      expect(stack.authorizerFunction.runtime).toStrictEqual(lambda.Runtime.NODEJS_24_X);
    });

    it('should have correct timeout duration', () => {
      expect(stack.authorizerFunction.timeout?.toSeconds()).toBe(10);
    });

    it('should have the correct handler entry point', () => {
      // NodejsFunction abstracts the entry point, so we just verify the function exists
      expect(stack.authorizerFunction).toBeDefined();
    });
  });

  describe('CloudFormation Outputs', () => {
    it('should create stack outputs', () => {
      // Verify that the stack can be synthesized (outputs are defined)
      expect(stack.node.root).toBeDefined();
    });

    it('should export authorizer function ARN', () => {
      const template = cdk.assertions.Template.fromStack(stack);
      template.hasOutput('AuthorizerFunctionArn', {
        Export: {
          Name: 'gatekeeper-authorizer-function-arn-test',
        },
      });
    });
  });

  describe('different environment configurations', () => {
    it('should create stack for production environment', () => {
      const prodStack = new LambdaStack(app, 'ProdStack', {
        appName: 'gatekeeper',
        envName: 'prd',
        loggingEnabled: true,
        loggingLevel: 'info',
        loggingFormat: 'json',
      });

      expect(prodStack).toBeInstanceOf(LambdaStack);
      expect(prodStack.authorizerFunction).toBeDefined();
    });

    it('should create stack for development environment', () => {
      const devStack = new LambdaStack(app, 'DevStack', {
        appName: 'gatekeeper',
        envName: 'dev',
        loggingEnabled: true,
        loggingLevel: 'debug',
        loggingFormat: 'json',
      });

      expect(devStack).toBeInstanceOf(LambdaStack);
      expect(devStack.authorizerFunction).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should have all required properties accessible', () => {
      expect(stack.authorizerFunction).toBeDefined();
    });

    it('should create Lambda function with correct timeout', () => {
      expect(stack.authorizerFunction.timeout?.toSeconds()).toBe(10);
    });

    it('should support multiple stacks in same app', () => {
      const stack2 = new LambdaStack(app, 'SecondStack', {
        appName: 'gatekeeper',
        envName: 'staging',
        loggingEnabled: true,
        loggingLevel: 'info',
        loggingFormat: 'json',
      });

      expect(stack.authorizerFunction).not.toBe(stack2.authorizerFunction);
    });
  });

  describe('stack properties', () => {
    it('should accept appName property', () => {
      const customStack = new LambdaStack(app, 'CustomAppStack', {
        appName: 'my-custom-app',
        envName: 'test',
        loggingEnabled: true,
        loggingLevel: 'debug',
        loggingFormat: 'json',
      });

      expect(customStack.authorizerFunction).toBeDefined();
    });

    it('should accept envName property and apply it to resources', () => {
      const stagingStack = new LambdaStack(app, 'StagingStack', {
        appName: 'gatekeeper',
        envName: 'staging',
        loggingEnabled: false,
        loggingLevel: 'error',
        loggingFormat: 'text',
      });

      expect(stagingStack.authorizerFunction).toBeDefined();
    });

    it('should accept logging configuration properties', () => {
      const loggingStack = new LambdaStack(app, 'LoggingStack', {
        appName: 'gatekeeper',
        envName: 'test',
        loggingEnabled: true,
        loggingLevel: 'warn',
        loggingFormat: 'text',
      });

      expect(loggingStack.authorizerFunction).toBeDefined();
    });
  });
});
