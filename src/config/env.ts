import dotenv from 'dotenv';

dotenv.config();

interface Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucketNames: string[];
  endpoint: string;
  region: string;
  privateToken: string;
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  redisUrl?: string;
}

function validateEnv(): Config {
  const required = [
    'ACCESS_KEY_ID',
    'SECRET_ACCESS_KEY',
    'BUCKET_NAMES',
    'ENDPOINT',
    'PRIVATE_TOKEN',
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const bucketNames = (process.env.BUCKET_NAMES || '').split(',').map(b => b.trim());
  if (bucketNames.length === 0) {
    throw new Error('BUCKET_NAMES must contain at least one bucket');
  }

  return {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
    bucketNames,
    endpoint: process.env.ENDPOINT!,
    region: process.env.REGION || 'us-east-1',
    privateToken: process.env.PRIVATE_TOKEN!,
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '1800000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
    redisUrl: process.env.REDIS_URL,
  };
}

export const config = validateEnv();
