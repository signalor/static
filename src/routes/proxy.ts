import type { Express, Request, Response, NextFunction } from 'express';
import { s3Service } from '../services/s3.service';
import mime from 'mime-types';

export function setupProxyRoutes(app: Express) {
  /**
   * Proxy route: GET /bucketname/path/to/file.ext or GET /friendly-name/path/to/file.ext
   * Serves files directly from S3 bucket (accepts both friendly and actual bucket names)
   */
  app.get('/:bucketName/*', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bucketName } = req.params;
      const filePath = req.params[0]; // Get everything after bucketName

      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: 'No file specified',
        });
      }

      // Validate bucket (accepts friendly or actual name)
      if (!s3Service.validateBucket(bucketName)) {
        return res.status(404).json({
          success: false,
          error: 'Bucket not found',
        });
      }

      // Get file from S3
      const s3Object = await s3Service.getObject(bucketName, filePath);

      // Set content type
      const contentType = s3Object.ContentType || mime.lookup(filePath) || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);

      // Set content length if available
      if (s3Object.ContentLength) {
        res.setHeader('Content-Length', s3Object.ContentLength);
      }

      // Set cache headers
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year

      // Stream the file
      if (s3Object.Body) {
        // Handle AWS SDK v3 stream response
        const body = s3Object.Body as any;
        if (typeof body.pipe === 'function') {
          body.pipe(res);
        } else if (typeof body.transformToWebStream === 'function') {
          // Handle Blob/WebStream response
          const webStream = body.transformToWebStream();
          res.setHeader('Content-Type', contentType);
          webStream.pipeTo(res as any);
        } else if (body[Symbol.asyncIterator]) {
          // Handle async iterable response
          (async () => {
            try {
              for await (const chunk of body) {
                res.write(chunk);
              }
              res.end();
            } catch (error) {
              res.destroy();
            }
          })();
        } else {
          res.status(500).json({
            success: false,
            error: 'Unable to stream file',
          });
        }
      } else {
        res.status(404).json({
          success: false,
          error: 'File not found',
        });
      }
    } catch (error: any) {
      if (error.Code === 'NoSuchKey' || error.name === 'NoSuchKey') {
        return res.status(404).json({
          success: false,
          error: 'File not found',
        });
      }

      if (error.message === 'Invalid bucket') {
        return res.status(404).json({
          success: false,
          error: 'Bucket not found',
        });
      }

      next(error);
    }
  });
}
