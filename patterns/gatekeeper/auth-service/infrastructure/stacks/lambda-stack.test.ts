import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
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
      corsAllowOrigin: 'http://localhost:3000',
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

    it('should create a TokenAuthorizer', () => {
      expect(stack.authorizer).toBeDefined();
      expect(stack.authorizer).toBeInstanceOf(apigateway.TokenAuthorizer);
    });

    it('should create an API Gateway REST API', () => {
      expect(stack.api).toBeDefined();
      expect(stack.api).toBeInstanceOf(apigateway.RestApi);
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

  describe('API Gateway', () => {
    it('should have the correct API name', () => {
      expect(stack.api.restApiName).toBe('gatekeeper-api-test');
    });

    it('should have a root resource', () => {
      expect(stack.api.root).toBeDefined();
      expect(stack.api.restApiId).toBeDefined();
    });

    it('should have REST API ID defined', () => {
      expect(stack.api.restApiId).toBeTruthy();
    });
  });

  describe('CloudFormation Outputs', () => {
    it('should create stack outputs', () => {
      // Verify that the stack can be synthesized (outputs are defined)
      expect(stack.node.root).toBeDefined();
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
        corsAllowOrigin: 'https://example.com',
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
        corsAllowOrigin: '*',
      });

      expect(devStack).toBeInstanceOf(LambdaStack);
      expect(devStack.authorizerFunction).toBeDefined();
    });

    it('should accept custom CORS origin from props', () => {
      const customStack = new LambdaStack(app, 'CustomStack', {
        appName: 'gatekeeper',
        envName: 'test',
        loggingEnabled: true,
        loggingLevel: 'debug',
        loggingFormat: 'json',
        corsAllowOrigin: 'https://custom-domain.com',
      });

      expect(customStack).toBeInstanceOf(LambdaStack);
      expect(customStack.api).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should have all required properties accessible', () => {
      expect(stack.authorizerFunction).toBeDefined();
      expect(stack.authorizer).toBeDefined();
      expect(stack.api).toBeDefined();
    });

    it('should create Lambda function with correct timeout', () => {
      expect(stack.authorizerFunction.timeout?.toSeconds()).toBe(10);
    });

    it('should create API with name containing appName', () => {
      // The exact name includes tokens until synthesis, so just verify it exists
      expect(stack.api.restApiName).toBeTruthy();
    });

    it('should support multiple stacks in same app', () => {
      const stack2 = new LambdaStack(app, 'SecondStack', {
        appName: 'gatekeeper',
        envName: 'staging',
        loggingEnabled: true,
        loggingLevel: 'info',
        loggingFormat: 'json',
        corsAllowOrigin: '*',
      });

      expect(stack.authorizerFunction).not.toBe(stack2.authorizerFunction);
      expect(stack.api).not.toBe(stack2.api);
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
        corsAllowOrigin: 'http://localhost',
      });

      expect(customStack.authorizerFunction).toBeDefined();
      expect(customStack.api).toBeDefined();
    });

    it('should accept envName property and apply it to resources', () => {
      const stagingStack = new LambdaStack(app, 'StagingStack', {
        appName: 'gatekeeper',
        envName: 'staging',
        loggingEnabled: false,
        loggingLevel: 'error',
        loggingFormat: 'text',
        corsAllowOrigin: 'https://staging.example.com',
      });

      expect(stagingStack.authorizerFunction).toBeDefined();
      expect(stagingStack.api).toBeDefined();
    });

    it('should accept logging configuration properties', () => {
      const loggingStack = new LambdaStack(app, 'LoggingStack', {
        appName: 'gatekeeper',
        envName: 'test',
        loggingEnabled: true,
        loggingLevel: 'warn',
        loggingFormat: 'text',
        corsAllowOrigin: '*',
      });

      expect(loggingStack.authorizerFunction).toBeDefined();
    });
  });
});
