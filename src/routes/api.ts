import type { Express, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { s3Service } from '../services/s3.service';
import {
  authMiddleware,
  verifyPassword,
  createSession,
  optionalAuthMiddleware,
} from '../middleware/auth';
import type { Readable } from 'stream';

const upload = multer({ storage: multer.memoryStorage() });

interface AuthRequest extends Request {
  authenticated?: boolean;
}

export function setupApiRoutes(app: Express, authLimiter: any, apiLimiter: any) {
  // Auth endpoint - check password and get session token
  app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password required',
      });
    }

    if (!verifyPassword(password)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
      });
    }

    const sessionToken = createSession();

    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.json({
      success: true,
      sessionToken,
    });
  });

  // List buckets (with friendly names)
  app.get('/api/buckets', optionalAuthMiddleware, (req: AuthRequest, res: Response) => {
    const { config } = require('../config/env');
    const buckets = config.bucketNames.map((actualName: string) => ({
      actual: actualName,
      friendly: s3Service.getFriendlyBucketName(actualName),
    }));

    res.json({
      success: true,
      buckets,
      authenticated: !!req.authenticated,
    });
  });

  // List files in a bucket (accepts friendly or actual bucket name)
  app.get(
    '/api/buckets/:bucketName/files',
    optionalAuthMiddleware,
    apiLimiter,
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const { bucketName } = req.params;
        const { prefix = '', continuationToken } = req.query;

        if (!s3Service.validateBucket(bucketName)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid bucket',
          });
        }

        const result = await s3Service.listObjects(
          bucketName,
          String(prefix),
          continuationToken ? String(continuationToken) : undefined
        );

        res.json({
          success: true,
          data: result,
          bucketDisplayName: s3Service.getFriendlyBucketName(s3Service.getActualBucketName(bucketName)),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Upload file
  app.post(
    '/api/buckets/:bucketName/upload',
    authMiddleware,
    apiLimiter,
    upload.single('file'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const { bucketName } = req.params;
        const { key } = req.body;

        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'No file provided',
          });
        }

        if (!key) {
          return res.status(400).json({
            success: false,
            error: 'Key is required',
          });
        }

        if (!s3Service.validateBucket(bucketName)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid bucket',
          });
        }

        await s3Service.uploadFile(
          bucketName,
          key,
          req.file.buffer,
          req.file.mimetype
        );

        res.json({
          success: true,
          message: 'File uploaded successfully',
          key,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Delete file (accepts friendly or actual bucket name)
  app.delete(
    '/api/buckets/:bucketName/files/:fileKey',
    authMiddleware,
    apiLimiter,
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const { bucketName, fileKey } = req.params;

        if (!s3Service.validateBucket(bucketName)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid bucket',
          });
        }

        // Decode the file key (it's URL encoded)
        const decodedKey = decodeURIComponent(fileKey);

        await s3Service.deleteFile(bucketName, decodedKey);

        res.json({
          success: true,
          message: 'File deleted successfully',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Move/rename file (accepts friendly or actual bucket name)
  app.post(
    '/api/buckets/:bucketName/move',
    authMiddleware,
    apiLimiter,
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const { bucketName } = req.params;
        const { sourceKey, targetKey } = req.body;

        if (!sourceKey || !targetKey) {
          return res.status(400).json({
            success: false,
            error: 'sourceKey and targetKey are required',
          });
        }

        if (!s3Service.validateBucket(bucketName)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid bucket',
          });
        }

        await s3Service.moveFile(bucketName, sourceKey, targetKey);

        res.json({
          success: true,
          message: 'File moved successfully',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Copy file (accepts friendly or actual bucket name)
  app.post(
    '/api/buckets/:bucketName/copy',
    authMiddleware,
    apiLimiter,
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const { bucketName } = req.params;
        const { sourceKey, targetKey } = req.body;

        if (!sourceKey || !targetKey) {
          return res.status(400).json({
            success: false,
            error: 'sourceKey and targetKey are required',
          });
        }

        if (!s3Service.validateBucket(bucketName)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid bucket',
          });
        }

        await s3Service.copyFile(bucketName, sourceKey, targetKey);

        res.json({
          success: true,
          message: 'File copied successfully',
        });
      } catch (error) {
        next(error);
      }
    }
  );
}
