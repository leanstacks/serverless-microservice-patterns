/**
 * @module utils/s3-client
 * @description Utility functions for interacting with AWS S3, including retrieving object content.
 */

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Singleton S3 client instance for retrieving objects from S3 buckets.
 */
export const s3Client = new S3Client({
  region: config.AWS_REGION,
});

/**
 * Retrieves the content of an object from an S3 bucket.
 * @param bucketName - The name of the S3 bucket
 * @param objectKey - The key of the object to retrieve
 * @returns Promise that resolves to the object content as a string
 * @throws Error if the S3 get operation fails
 */
export const getObjectContent = async (bucketName: string, objectKey: string): Promise<string> => {
  logger.info({ bucketName, objectKey }, '[S3Client] > getObjectContent');

  try {
    // Create the GetObjectCommand with the provided parameters
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });
    logger.debug({ command }, '[S3Client] getObjectContent - GetObjectCommand');

    // Get the object using the S3 client
    const response = await s3Client.send(command);

    // Convert the stream to a string
    const contentStream = response.Body;
    if (!contentStream) {
      throw new Error('Object body is empty');
    }

    const content = await contentStream.transformToString('utf-8');

    logger.info(
      {
        bucketName,
        objectKey,
        contentLength: content.length,
      },
      '[S3Client] < getObjectContent - successfully retrieved object',
    );
    return content;
  } catch (error) {
    // Handle any errors that occur during the get operation
    logger.error({ error, bucketName, objectKey }, '[S3Client] < getObjectContent - failed to retrieve object from S3');
    throw error;
  }
};
