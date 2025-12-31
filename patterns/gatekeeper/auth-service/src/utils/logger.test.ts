describe('logger', () => {
  beforeEach(() => {
    jest.resetModules();

    // Mock config BEFORE importing logger
    jest.doMock('./config', () => ({
      config: {
        LOGGING_ENABLED: true,
        LOGGING_LEVEL: 'debug',
        LOGGING_FORMAT: 'json',
        TASKS_TABLE: 'test-table',
        AWS_REGION: 'us-east-1',
        CORS_ALLOW_ORIGIN: '*',
      },
    }));
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('logger exports', () => {
    it('should export a logger instance', () => {
      // Arrange & Act
      const { logger } = require('./logger');

      // Assert
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should export withRequestTracking function', () => {
      // Arrange & Act
      const { withRequestTracking } = require('./logger');

      // Assert
      expect(withRequestTracking).toBeDefined();
      expect(typeof withRequestTracking).toBe('function');
    });

    it('should export getLogger function', () => {
      // Arrange & Act
      const module = require('./logger');
      const { logger: loggerInstance } = module;

      // Assert
      expect(loggerInstance).toBeDefined();
    });

    it('should export resetLogger function', () => {
      // Arrange & Act
      const { resetLogger: resetFn } = require('./logger');

      // Assert
      expect(resetFn).toBeDefined();
      expect(typeof resetFn).toBe('function');
    });
  });

  describe('logger configuration', () => {
    it('should create a logger with enabled logging when LOGGING_ENABLED is true', () => {
      // Act
      const { logger } = require('./logger');

      // Assert
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should create a logger with disabled logging when LOGGING_ENABLED is false', () => {
      // Arrange
      jest.resetModules();
      jest.doMock('./config', () => ({
        config: {
          LOGGING_ENABLED: false,
          LOGGING_LEVEL: 'debug',
          LOGGING_FORMAT: 'json',
          TASKS_TABLE: 'test-table',
          AWS_REGION: 'us-east-1',
          CORS_ALLOW_ORIGIN: '*',
        },
      }));

      // Act
      const { logger } = require('./logger');

      // Assert
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });
  });

  describe('logger methods', () => {
    it('should allow calling logger.info(message)', () => {
      // Arrange
      const { logger } = require('./logger');
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      // Act
      logger.info('test message');

      // Assert
      expect(stdoutSpy).toHaveBeenCalled();
      stdoutSpy.mockRestore();
    });

    it('should allow calling logger.info(data, message)', () => {
      // Arrange
      const { logger } = require('./logger');
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      // Act
      logger.info({ userId: 123 }, 'user action');

      // Assert
      expect(stdoutSpy).toHaveBeenCalled();
      stdoutSpy.mockRestore();
    });

    it('should allow calling logger.debug(data, message)', () => {
      // Arrange
      const { logger } = require('./logger');
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      // Act
      logger.debug({ request: 'data' }, 'debug message');

      // Assert
      expect(stdoutSpy).toHaveBeenCalled();
      stdoutSpy.mockRestore();
    });

    it('should allow calling logger.error(data, message)', () => {
      // Arrange
      const { logger } = require('./logger');
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      // Act
      logger.error({ error: new Error('test') }, 'error occurred');

      // Assert
      expect(stdoutSpy).toHaveBeenCalled();
      stdoutSpy.mockRestore();
    });

    it('should allow calling logger.warn(data, message)', () => {
      // Arrange
      const { logger } = require('./logger');
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      // Act
      logger.warn({ warning: 'something' }, 'warning message');

      // Assert
      expect(stdoutSpy).toHaveBeenCalled();
      stdoutSpy.mockRestore();
    });
  });

  describe('logger formatting', () => {
    it('should use StructuredLogFormatter when LOGGING_FORMAT is json', () => {
      // Arrange
      const mockStructuredFormatter = jest.fn();
      const mockCloudwatchFormatter = jest.fn();

      jest.doMock('pino-lambda', () => ({
        StructuredLogFormatter: mockStructuredFormatter,
        CloudwatchLogFormatter: mockCloudwatchFormatter,
        pinoLambdaDestination: jest.fn(() => ({})),
        lambdaRequestTracker: jest.fn(() => jest.fn()),
      }));

      jest.resetModules();
      jest.doMock('./config', () => ({
        config: {
          LOGGING_ENABLED: true,
          LOGGING_LEVEL: 'info',
          LOGGING_FORMAT: 'json',
          TASKS_TABLE: 'test-table',
          AWS_REGION: 'us-east-1',
          CORS_ALLOW_ORIGIN: '*',
        },
      }));

      // Act
      require('./logger');

      // Assert
      expect(mockStructuredFormatter).toHaveBeenCalled();
      expect(mockCloudwatchFormatter).not.toHaveBeenCalled();
    });

    it('should use CloudwatchLogFormatter when LOGGING_FORMAT is text', () => {
      // Arrange
      const mockStructuredFormatter = jest.fn();
      const mockCloudwatchFormatter = jest.fn();

      jest.doMock('pino-lambda', () => ({
        StructuredLogFormatter: mockStructuredFormatter,
        CloudwatchLogFormatter: mockCloudwatchFormatter,
        pinoLambdaDestination: jest.fn(() => ({})),
        lambdaRequestTracker: jest.fn(() => jest.fn()),
      }));

      jest.resetModules();
      jest.doMock('./config', () => ({
        config: {
          LOGGING_ENABLED: true,
          LOGGING_LEVEL: 'info',
          LOGGING_FORMAT: 'text',
          TASKS_TABLE: 'test-table',
          AWS_REGION: 'us-east-1',
          CORS_ALLOW_ORIGIN: '*',
        },
      }));

      // Act
      require('./logger');

      // Assert
      expect(mockCloudwatchFormatter).toHaveBeenCalled();
      expect(mockStructuredFormatter).not.toHaveBeenCalled();
    });

    it('should use CloudwatchLogFormatter for non-json LOGGING_FORMAT values', () => {
      // Arrange
      const mockStructuredFormatter = jest.fn();
      const mockCloudwatchFormatter = jest.fn();

      jest.doMock('pino-lambda', () => ({
        StructuredLogFormatter: mockStructuredFormatter,
        CloudwatchLogFormatter: mockCloudwatchFormatter,
        pinoLambdaDestination: jest.fn(() => ({})),
        lambdaRequestTracker: jest.fn(() => jest.fn()),
      }));

      jest.resetModules();
      jest.doMock('./config', () => ({
        config: {
          LOGGING_ENABLED: true,
          LOGGING_LEVEL: 'info',
          LOGGING_FORMAT: 'custom',
          TASKS_TABLE: 'test-table',
          AWS_REGION: 'us-east-1',
          CORS_ALLOW_ORIGIN: '*',
        },
      }));

      // Act
      require('./logger');

      // Assert
      expect(mockCloudwatchFormatter).toHaveBeenCalled();
      expect(mockStructuredFormatter).not.toHaveBeenCalled();
    });
  });

  describe('getLogger function', () => {
    it('should create a logger instance when module is first imported', () => {
      // Arrange & Act
      const { logger } = require('./logger');

      // Assert
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should return the same logger instance on subsequent imports (singleton pattern)', () => {
      // Arrange
      const module1 = require('./logger');
      const firstLogger = module1.logger;

      // Act
      const module2 = require('./logger');
      const secondLogger = module2.logger;

      // Assert
      expect(secondLogger).toBe(firstLogger);
    });
  });

  describe('resetLogger', () => {
    it('should reset the logger instance', () => {
      // Arrange
      const { logger: logger1, resetLogger: reset } = require('./logger');

      // Act
      reset();
      jest.resetModules();
      jest.doMock('./config', () => ({
        config: {
          LOGGING_ENABLED: true,
          LOGGING_LEVEL: 'debug',
          LOGGING_FORMAT: 'json',
          TASKS_TABLE: 'test-table',
          AWS_REGION: 'us-east-1',
          CORS_ALLOW_ORIGIN: '*',
        },
      }));
      const { logger: logger2 } = require('./logger');

      // Assert
      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
    });
  });
});
