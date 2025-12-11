import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/cdk.out/**',
    '!jest.config.ts',
    '!jest.setup.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'json-summary', 'text', 'lcov', 'clover'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 30000, // CDK operations can take longer
};

export default config;
