import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { config } from '../config/env';
import type { Readable } from 'stream';

interface FileObject {
  key: string;
  size: number;
  lastModified: Date;
  eTag: string;
}

interface FileListResponse {
  files: FileObject[];
  continuationToken?: string;
}

class S3Service {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: true,
    });
  }

  /**
   * Convert friendly bucket name to actual bucket name
   */
  resolveBucketName(bucketNameOrFriendly: string): string | null {
    // Check if it's an actual bucket name first
    if (config.bucketNames.includes(bucketNameOrFriendly)) {
      return bucketNameOrFriendly;
    }

    // Check if it's a friendly name
    const actualName = config.bucketNameMap.get(bucketNameOrFriendly);
    if (actualName) {
      return actualName;
    }

    return null;
  }

  /**
   * Get friendly name for a bucket (or the actual name if no friendly name exists)
   */
  getFriendlyBucketName(actualBucketName: string): string {
    return config.actualBucketMap.get(actualBucketName) || actualBucketName;
  }

  /**
   * Validate that a bucket exists in the configured list (accepts both friendly and actual names)
   */
  validateBucket(bucketNameOrFriendly: string): boolean {
    return this.resolveBucketName(bucketNameOrFriendly) !== null;
  }

  /**
   * Get actual bucket name (throws error if invalid)
   */
  getActualBucketName(bucketNameOrFriendly: string): string {
    const actual = this.resolveBucketName(bucketNameOrFriendly);
    if (!actual) {
      throw new Error('Invalid bucket');
    }
    return actual;
  }

  /**
   * Get an object from S3
   */
  async getObject(bucketNameOrFriendly: string, key: string) {
    const actualBucket = this.getActualBucketName(bucketNameOrFriendly);

    const command = new GetObjectCommand({
      Bucket: actualBucket,
      Key: key,
    });

    return this.client.send(command);
  }

  /**
   * List objects in a bucket with optional prefix (folder)
   */
  async listObjects(
    bucketNameOrFriendly: string,
    prefix: string = '',
    continuationToken?: string
  ): Promise<FileListResponse> {
    const actualBucket = this.getActualBucketName(bucketNameOrFriendly);

    const command = new ListObjectsV2Command({
      Bucket: actualBucket,
      Prefix: prefix,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
      Delimiter: '/',
    });

    const response = await this.client.send(command);

    const files: FileObject[] = [];

    // Add files
    if (response.Contents) {
      files.push(
        ...response.Contents.map(obj => ({
          key: obj.Key || '',
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
          eTag: obj.ETag || '',
        }))
      );
    }

    // Add "folders" (prefixes)
    if (response.CommonPrefixes) {
      files.push(
        ...response.CommonPrefixes.map(prefix => ({
          key: prefix.Prefix || '',
          size: 0,
          lastModified: new Date(),
          eTag: 'folder',
        }))
      );
    }

    return {
      files,
      continuationToken: response.NextContinuationToken,
    };
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    bucketNameOrFriendly: string,
    key: string,
    body: Buffer | Readable,
    contentType?: string
  ) {
    const actualBucket = this.getActualBucketName(bucketNameOrFriendly);

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: actualBucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      },
    });

    return upload.done();
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(bucketNameOrFriendly: string, key: string) {
    const actualBucket = this.getActualBucketName(bucketNameOrFriendly);

    const command = new DeleteObjectCommand({
      Bucket: actualBucket,
      Key: key,
    });

    return this.client.send(command);
  }

  /**
   * Move a file within the bucket (copy then delete)
   */
  async moveFile(bucketNameOrFriendly: string, sourceKey: string, targetKey: string) {
    const actualBucket = this.getActualBucketName(bucketNameOrFriendly);

    // Copy to new location
    const copyCommand = new CopyObjectCommand({
      Bucket: actualBucket,
      CopySource: `/${actualBucket}/${sourceKey}`,
      Key: targetKey,
    });

    await this.client.send(copyCommand);

    // Delete original
    const deleteCommand = new DeleteObjectCommand({
      Bucket: actualBucket,
      Key: sourceKey,
    });

    await this.client.send(deleteCommand);
  }

  /**
   * Copy a file within the bucket
   */
  async copyFile(bucketNameOrFriendly: string, sourceKey: string, targetKey: string) {
    const actualBucket = this.getActualBucketName(bucketNameOrFriendly);

    const command = new CopyObjectCommand({
      Bucket: actualBucket,
      CopySource: `/${actualBucket}/${sourceKey}`,
      Key: targetKey,
    });

    return this.client.send(command);
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(bucketNameOrFriendly: string, key: string) {
    const response = await this.getObject(bucketNameOrFriendly, key);
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      eTag: response.ETag,
    };
  }
}

export const s3Service = new S3Service();
