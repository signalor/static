import dotenv from 'dotenv';

dotenv.config();

interface Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucketNames: string[];
  friendlyBucketNames?: string[];
  bucketNameMap: Map<string, string>; // friendly -> actual
  actualBucketMap: Map<string, string>; // actual -> friendly
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

  const friendlyNames = (process.env.FRIENDLY_BUCKET_NAMES || '')
    .split(',')
    .map(b => b.trim())
    .filter(b => b.length > 0);

  // Validate friendly names match bucket names count
  if (friendlyNames.length > 0 && friendlyNames.length !== bucketNames.length) {
    throw new Error(
      `FRIENDLY_BUCKET_NAMES count (${friendlyNames.length}) must match BUCKET_NAMES count (${bucketNames.length})`
    );
  }

  // Create mappings
  const bucketNameMap = new Map<string, string>();
  const actualBucketMap = new Map<string, string>();

  if (friendlyNames.length > 0) {
    bucketNames.forEach((actual, index) => {
      const friendly = friendlyNames[index];
      bucketNameMap.set(friendly, actual);
      actualBucketMap.set(actual, friendly);
    });
  } else {
    // No friendly names, map to themselves
    bucketNames.forEach(name => {
      bucketNameMap.set(name, name);
      actualBucketMap.set(name, name);
    });
  }

  return {
    accessKeyId: process.env.ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.SECRET_ACCESS_KEY!.trim(),
    bucketNames,
    friendlyBucketNames: friendlyNames.length > 0 ? friendlyNames : undefined,
    bucketNameMap,
    actualBucketMap,
    endpoint: process.env.ENDPOINT!.trim().replace(/\/+$/, ''),
    region: (process.env.REGION || 'us-east-1').trim(),
    privateToken: process.env.PRIVATE_TOKEN!,
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '1800000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
    redisUrl: process.env.REDIS_URL,
  };
}

export const config = validateEnv();
