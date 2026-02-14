import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env';
import { setupRateLimiters } from './middleware/rateLimiter';
import { setupApiRoutes } from './routes/api';
import { setupProxyRoutes } from './routes/proxy';
import type { Request, Response, NextFunction } from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());

// Serve static files (GUI)
app.use(express.static(path.join(__dirname, 'public')));

// Setup rate limiters
let authLimiter: any;
let apiLimiter: any;

async function startServer() {
  try {
    const limiters = await setupRateLimiters();
    authLimiter = limiters.authLimiter;
    apiLimiter = limiters.apiLimiter;

    // Setup routes
    setupApiRoutes(app, authLimiter, apiLimiter);
    setupProxyRoutes(app);

    // Error handler
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Error:', err);

      if (err.message === 'Invalid bucket') {
        return res.status(400).json({
          success: false,
          error: 'Invalid bucket',
        });
      }

      res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      });
    });

    // 404 handler
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Not found',
      });
    });

    // Start server
    app.listen(config.port, () => {
      console.log(`\n🚀 File server running on http://localhost:${config.port}`);
      console.log(`📁 Buckets: ${config.bucketNames.join(', ')}`);
      console.log(`🔗 File URL: http://localhost:${config.port}/bucketname/path/to/file.ext\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
