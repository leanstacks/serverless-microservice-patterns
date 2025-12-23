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
    it('should apply default values for optional environment variables', () => {
      // Arrange
      // Act
      config = require('./config').config;

      // Assert
      expect(config.AWS_REGION).toBe('us-east-1');
      expect(config.LOGGING_ENABLED).toBe(true);
      expect(config.LOGGING_LEVEL).toBe('debug');
      expect(config.LOGGING_FORMAT).toBe('json');
    });

    it('should use provided values instead of defaults', () => {
      // Arrange
      process.env.AWS_REGION = 'us-west-2';
      process.env.LOGGING_ENABLED = 'false';
      process.env.LOGGING_LEVEL = 'error';
      process.env.LOGGING_FORMAT = 'text';

      // Act
      config = require('./config').config;

      // Assert
      expect(config.AWS_REGION).toBe('us-west-2');
      expect(config.LOGGING_ENABLED).toBe(false);
      expect(config.LOGGING_LEVEL).toBe('error');
      expect(config.LOGGING_FORMAT).toBe('text');
    });

    it('should transform LOGGING_ENABLED string to boolean true', () => {
      // Arrange
      process.env.LOGGING_ENABLED = 'true';

      // Act
      config = require('./config').config;

      // Assert
      expect(config.LOGGING_ENABLED).toBe(true);
      expect(typeof config.LOGGING_ENABLED).toBe('boolean');
    });

    it('should transform LOGGING_ENABLED string to boolean false', () => {
      // Arrange
      process.env.LOGGING_ENABLED = 'false';

      // Act
      config = require('./config').config;

      // Assert
      expect(config.LOGGING_ENABLED).toBe(false);
      expect(typeof config.LOGGING_ENABLED).toBe('boolean');
    });

    it('should validate LOGGING_LEVEL enum values', () => {
      // Arrange
      // Act & Assert - valid values
      const validLogLevels = ['debug', 'info', 'warn', 'error'];
      validLogLevels.forEach((level) => {
        jest.resetModules();
        process.env.LOGGING_LEVEL = level;
        config = require('./config').config;
        expect(config.LOGGING_LEVEL).toBe(level);
      });
    });

    it('should throw error for invalid LOGGING_LEVEL', () => {
      // Arrange
      process.env.LOGGING_LEVEL = 'invalid';

      // Act & Assert
      expect(() => {
        const { config: testConfig } = require('./config');
        return testConfig;
      }).toThrow('Configuration validation failed');
    });

    it('should throw error for invalid LOGGING_ENABLED value', () => {
      // Arrange
      process.env.LOGGING_ENABLED = 'yes';

      // Act & Assert
      expect(() => {
        const { config: testConfig } = require('./config');
        return testConfig;
      }).toThrow('Configuration validation failed');
    });

    it('should validate LOGGING_FORMAT enum values', () => {
      // Arrange

      // Act & Assert - valid values
      const validLogFormats = ['text', 'json'];
      validLogFormats.forEach((format) => {
        jest.resetModules();
        process.env.LOGGING_FORMAT = format;
        config = require('./config').config;
        expect(config.LOGGING_FORMAT).toBe(format);
      });
    });

    it('should throw error for invalid LOGGING_FORMAT', () => {
      // Arrange
      process.env.LOGGING_FORMAT = 'xml';

      // Act & Assert
      expect(() => {
        const { config: testConfig } = require('./config');
        return testConfig;
      }).toThrow('Configuration validation failed');
    });
  });

  describe('refreshConfig', () => {
    it('should refresh config when environment variables change', () => {
      // Arrange
      process.env.AWS_REGION = 'us-east-1';
      refreshConfig = require('./config').refreshConfig;
      config = require('./config').config;

      expect(config.AWS_REGION).toBe('us-east-1');

      // Act - change environment and refresh
      process.env.AWS_REGION = 'eu-west-1';
      const refreshedConfig = refreshConfig();

      // Assert
      expect(refreshedConfig.AWS_REGION).toBe('eu-west-1');
    });

    it('should update cached config after refresh', () => {
      // Arrange
      process.env.AWS_REGION = 'us-east-1';
      refreshConfig = require('./config').refreshConfig;
      const configModule = require('./config');
      const originalConfig = configModule.config;

      expect(originalConfig.AWS_REGION).toBe('us-east-1');

      // Act
      process.env.AWS_REGION = 'eu-west-1';
      const refreshedConfig = refreshConfig();

      // Assert - refreshedConfig should have new value
      expect(refreshedConfig.AWS_REGION).toBe('eu-west-1');
      // The originally exported config constant won't change, but refreshConfig returns the new value
      expect(originalConfig.AWS_REGION).toBe('us-east-1');
    });
  });

  describe('config caching', () => {
    it('should cache config after first validation', () => {
      // Arrange
      process.env.AWS_REGION = 'us-west-1';
      const configModule = require('./config');

      // Act
      const config1 = configModule.config;
      const config2 = configModule.config;

      // Assert - same reference means it's cached
      expect(config1).toBe(config2);
    });

    it('should return cached config on subsequent imports', () => {
      // Arrange
      process.env.AWS_REGION = 'us-west-1';

      // Act
      const { config: firstConfig } = require('./config');

      // Change env (but don't refresh)
      process.env.AWS_REGION = 'eu-central-1';

      const { config: secondConfig } = require('./config');

      // Assert - should still have cached value
      expect(secondConfig.AWS_REGION).toBe('us-west-1');
      expect(firstConfig).toBe(secondConfig);
    });
  });

  describe('error handling', () => {
    it('should provide detailed error message for multiple validation failures', () => {
      // Arrange
      process.env.LOGGING_LEVEL = 'invalid';

      // Act & Assert
      expect(() => {
        const { config: testConfig } = require('./config');
        return testConfig;
      }).toThrow('Configuration validation failed');
    });
  });

  describe('type safety', () => {
    it('should export Config type matching validated schema', () => {
      // Arrange
      process.env.AWS_REGION = 'us-east-1';
      process.env.LOGGING_ENABLED = 'true';
      process.env.LOGGING_LEVEL = 'info';

      // Act
      config = require('./config').config;

      // Assert - verify all expected properties exist and have correct types
      expect(typeof config.AWS_REGION).toBe('string');
      expect(typeof config.LOGGING_ENABLED).toBe('boolean');
      expect(['debug', 'info', 'warn', 'error']).toContain(config.LOGGING_LEVEL);
    });
  });
});
