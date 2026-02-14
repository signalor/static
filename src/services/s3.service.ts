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
   * Validate that a bucket exists in the configured list
   */
  validateBucket(bucketName: string): boolean {
    return config.bucketNames.includes(bucketName);
  }

  /**
   * Get an object from S3
   */
  async getObject(bucketName: string, key: string) {
    if (!this.validateBucket(bucketName)) {
      throw new Error('Invalid bucket');
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return this.client.send(command);
  }

  /**
   * List objects in a bucket with optional prefix (folder)
   */
  async listObjects(
    bucketName: string,
    prefix: string = '',
    continuationToken?: string
  ): Promise<FileListResponse> {
    if (!this.validateBucket(bucketName)) {
      throw new Error('Invalid bucket');
    }

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
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
    bucketName: string,
    key: string,
    body: Buffer | Readable,
    contentType?: string
  ) {
    if (!this.validateBucket(bucketName)) {
      throw new Error('Invalid bucket');
    }

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: bucketName,
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
  async deleteFile(bucketName: string, key: string) {
    if (!this.validateBucket(bucketName)) {
      throw new Error('Invalid bucket');
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return this.client.send(command);
  }

  /**
   * Move a file within the bucket (copy then delete)
   */
  async moveFile(bucketName: string, sourceKey: string, targetKey: string) {
    if (!this.validateBucket(bucketName)) {
      throw new Error('Invalid bucket');
    }

    // Copy to new location
    const copyCommand = new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `/${bucketName}/${sourceKey}`,
      Key: targetKey,
    });

    await this.client.send(copyCommand);

    // Delete original
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: sourceKey,
    });

    await this.client.send(deleteCommand);
  }

  /**
   * Copy a file within the bucket
   */
  async copyFile(bucketName: string, sourceKey: string, targetKey: string) {
    if (!this.validateBucket(bucketName)) {
      throw new Error('Invalid bucket');
    }

    const command = new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `/${bucketName}/${sourceKey}`,
      Key: targetKey,
    });

    return this.client.send(command);
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(bucketName: string, key: string) {
    const response = await this.getObject(bucketName, key);
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      eTag: response.ETag,
    };
  }
}

export const s3Service = new S3Service();
