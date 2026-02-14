import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { config } from '../config/env';
import type { Request, Response } from 'express';

let redisClient: ReturnType<typeof createClient> | null = null;

async function initRedis() {
  if (!config.redisUrl) {
    console.log('Redis URL not configured, using in-memory rate limiting');
    return null;
  }

  try {
    const client = createClient({ url: config.redisUrl });
    await client.connect();
    redisClient = client;
    console.log('Redis connected for rate limiting');
    return client;
  } catch (error) {
    console.warn('Failed to connect to Redis, falling back to in-memory rate limiting:', error);
    return null;
  }
}

export async function setupRateLimiters() {
  const redis = await initRedis();

  const createLimiter = (windowMs: number, max: number) => {
    const options: any = {
      windowMs,
      max,
      message: 'Too many requests, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req: Request) => {
        // Skip rate limiting for file proxy routes
        return req.path.match(/^\/[^/]+\/.*/) && req.method === 'GET';
      },
    };

    if (redis) {
      try {
        options.store = new RedisStore({
          sendCommand: async (...args: string[]) => {
            return redis.sendCommand(args);
          },
          prefix: 'rl:',
        });
      } catch (error) {
        console.warn('Failed to create Redis store for rate limiting, using in-memory fallback:', error);
      }
    }

    return rateLimit(options);
  };

  return {
    // Auth endpoint: 10 requests per 30 minutes
    authLimiter: createLimiter(config.rateLimitWindowMs, config.rateLimitMaxRequests),
    // General API: 100 requests per minute
    apiLimiter: createLimiter(60 * 1000, 100),
  };
}

export { redisClient };
