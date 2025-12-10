describe('config', () => {
  let config: typeof import('./config').config;
  let refreshConfig: typeof import('./config').refreshConfig;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to clear the config cache
    jest.resetModules();

    // Mock logger to avoid circular dependency issues during testing
    jest.doMock('./logger', () => ({
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    }));

    // Reset environment variables to a clean slate
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('config validation', () => {
    it('should validate and return config with default values when env vars are not set', () => {
      // Arrange
      delete process.env.AWS_REGION;
      delete process.env.LOGGING_ENABLED;
      delete process.env.LOGGING_LEVEL;
      delete process.env.LOGGING_FORMAT;

      // Act
      config = require('./config').config;

      // Assert
      expect(config).toBeDefined();
      expect(config.AWS_REGION).toBe('us-east-1');
      expect(config.LOGGING_ENABLED).toBe(true);
      expect(config.LOGGING_LEVEL).toBe('debug');
      expect(config.LOGGING_FORMAT).toBe('json');
    });

    it('should apply custom values when environment variables are set', () => {
      // Arrange
      process.env.AWS_REGION = 'eu-west-1';
      process.env.LOGGING_LEVEL = 'info';

      // Act
      config = require('./config').config;

      // Assert
      expect(config.AWS_REGION).toBe('eu-west-1');
      expect(config.LOGGING_LEVEL).toBe('info');
    });

    it('should support valid logging levels', () => {
      // Arrange
      const validLevels = ['debug', 'info', 'warn', 'error'];

      for (const level of validLevels) {
        process.env.LOGGING_LEVEL = level;
        jest.resetModules();

        // Act
        config = require('./config').config;

        // Assert
        expect(config.LOGGING_LEVEL).toBe(level);
      }
    });

    it('should support valid logging formats', () => {
      // Arrange
      const validFormats = ['text', 'json'];

      for (const format of validFormats) {
        process.env.LOGGING_FORMAT = format;
        jest.resetModules();

        // Act
        config = require('./config').config;

        // Assert
        expect(config.LOGGING_FORMAT).toBe(format);
      }
    });

    it('should parse LOGGING_ENABLED as boolean from string', () => {
      // Arrange
      process.env.LOGGING_ENABLED = 'false';

      // Act
      config = require('./config').config;

      // Assert
      expect(typeof config.LOGGING_ENABLED).toBe('boolean');
      expect(config.LOGGING_ENABLED).toBe(false);
    });

    it('should parse LOGGING_ENABLED as true when set to "true"', () => {
      // Arrange
      process.env.LOGGING_ENABLED = 'true';

      // Act
      config = require('./config').config;

      // Assert
      expect(config.LOGGING_ENABLED).toBe(true);
    });
  });

  describe('config caching', () => {
    it('should cache the config on first load', () => {
      // Arrange
      process.env.AWS_REGION = 'us-west-2';

      // Act
      const config1 = require('./config').config;
      const config2 = require('./config').config;

      // Assert
      expect(config1).toBe(config2);
    });

    it('should allow refreshing the config', () => {
      // Arrange
      process.env.AWS_REGION = 'us-east-1';
      config = require('./config').config;
      const originalRegion = config.AWS_REGION;

      // Act
      process.env.AWS_REGION = 'eu-west-1';
      refreshConfig = require('./config').refreshConfig;
      const refreshedConfig = refreshConfig();

      // Assert
      expect(originalRegion).toBe('us-east-1');
      expect(refreshedConfig.AWS_REGION).toBe('eu-west-1');
    });

    it('should update cached config after refresh', () => {
      // Arrange
      process.env.AWS_REGION = 'us-east-1';
      config = require('./config').config;
      expect(config.AWS_REGION).toBe('us-east-1');

      // Act
      process.env.AWS_REGION = 'eu-west-1';
      refreshConfig = require('./config').refreshConfig;
      const newConfig = refreshConfig();

      // Assert
      expect(newConfig.AWS_REGION).toBe('eu-west-1');
    });
  });

  describe('config type validation', () => {
    it('should have correct types for all config properties', () => {
      // Arrange & Act
      config = require('./config').config;

      // Assert
      expect(typeof config.AWS_REGION).toBe('string');
      expect(typeof config.LOGGING_ENABLED).toBe('boolean');
      expect(typeof config.LOGGING_LEVEL).toBe('string');
      expect(typeof config.LOGGING_FORMAT).toBe('string');
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid logging level', () => {
      // Arrange
      process.env.LOGGING_LEVEL = 'invalid-level';

      // Act & Assert
      expect(() => {
        jest.resetModules();
        require('./config');
      }).toThrow();
    });

    it('should throw error for invalid logging format', () => {
      // Arrange
      process.env.LOGGING_FORMAT = 'invalid-format';

      // Act & Assert
      expect(() => {
        jest.resetModules();
        require('./config');
      }).toThrow();
    });

    it('should throw error for invalid LOGGING_ENABLED value', () => {
      // Arrange
      process.env.LOGGING_ENABLED = 'maybe';

      // Act & Assert
      expect(() => {
        jest.resetModules();
        require('./config');
      }).toThrow();
    });
  });
});
