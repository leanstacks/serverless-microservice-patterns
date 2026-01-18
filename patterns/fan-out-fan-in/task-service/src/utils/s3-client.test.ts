import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

// Mock the config before importing s3ClientModule
jest.mock('./config', () => ({
  config: {
    AWS_REGION: 'us-east-1',
  },
}));

// Mock the logger before importing s3ClientModule
const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('./logger', () => ({
  logger: {
    info: mockLoggerInfo,
    debug: mockLoggerDebug,
    error: mockLoggerError,
  },
}));

// Import s3ClientModule after mocks are set up
import * as s3ClientModule from './s3-client';

describe('s3-client', () => {
  const s3Mock = mockClient(S3Client);

  beforeEach(() => {
    jest.clearAllMocks();
    s3Mock.reset();
  });

  describe('getObjectContent', () => {
    it('should retrieve object content from S3 successfully', async () => {
      // Arrange
      const bucketName = 'test-bucket';
      const objectKey = 'test-key.csv';
      const csvContent = 'title,detail\nTask 1,Detail 1\nTask 2,Detail 2';

      // Create a mock readable stream
      const mockReadableStream = {
        transformToString: jest.fn().mockResolvedValue(csvContent),
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockReadableStream as any,
      });

      // Act
      const result = await s3ClientModule.getObjectContent(bucketName, objectKey);

      // Assert
      expect(result).toBe(csvContent);
      expect(s3Mock.call(0).args[0].input).toEqual({
        Bucket: bucketName,
        Key: objectKey,
      });
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          bucketName,
          objectKey,
          contentLength: csvContent.length,
        }),
        expect.stringContaining('successfully retrieved object'),
      );
    });

    it('should throw error when S3 object has no body', async () => {
      // Arrange
      const bucketName = 'test-bucket';
      const objectKey = 'test-key.csv';

      s3Mock.on(GetObjectCommand).resolves({
        Body: undefined as any,
      });

      // Act & Assert
      await expect(s3ClientModule.getObjectContent(bucketName, objectKey)).rejects.toThrow('Object body is empty');
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should handle S3 errors', async () => {
      // Arrange
      const bucketName = 'test-bucket';
      const objectKey = 'test-key.csv';
      const error = new Error('S3 access denied');

      s3Mock.on(GetObjectCommand).rejects(error);

      // Act & Assert
      await expect(s3ClientModule.getObjectContent(bucketName, objectKey)).rejects.toThrow('S3 access denied');
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ bucketName, objectKey, error }),
        expect.stringContaining('failed to retrieve object from S3'),
      );
    });
  });
});
