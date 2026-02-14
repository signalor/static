# File Server Architecture

## Overview

This is a production-ready S3-compatible bucket file server with the following components:

- **Web GUI**: React-like single-page application for file management
- **REST API**: Full file operation endpoints with authentication
- **File Proxy**: Public file serving at `/bucketname/path/to/file.ext`
- **Authentication**: Password-based with session tokens (1-hour TTL)
- **Rate Limiting**: Distributed rate limiting with Redis support
- **S3 Service**: Unified interface for S3-compatible buckets

## Project Structure

```
static/
├── src/
│   ├── server.ts              # Express app initialization
│   ├── config/
│   │   └── env.ts             # Environment validation
│   ├── services/
│   │   └── s3.service.ts      # S3 operations (singleton)
│   ├── middleware/
│   │   ├── auth.ts            # Session management & auth
│   │   └── rateLimiter.ts     # Rate limiting setup
│   ├── routes/
│   │   ├── api.ts             # API endpoints
│   │   └── proxy.ts           # File serving proxy
│   ├── utils/
│   │   └── validation.ts      # Input validation helpers
│   └── public/
│       └── index.html         # Embedded web GUI
├── dist/                      # Compiled JavaScript
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── QUICKSTART.md
└── ARCHITECTURE.md
```

## Data Flow

### Authentication Flow

```
User Request (Password)
    ↓
/api/auth/login [Rate Limited: 10 req/30 min]
    ↓
Password Verification
    ↓
Session Token Generation (1-hour TTL)
    ↓
HttpOnly Cookie Set
    ↓
Session stored in Memory
```

### File Upload Flow

```
User selects file
    ↓
Upload to /api/buckets/:bucket/upload
    ↓
[Requires Authentication]
    ↓
Multer Memory Storage
    ↓
S3 Upload via SDK
    ↓
200 OK Response
    ↓
UI Refresh File List
```

### File Proxy Flow

```
GET /bucket/path/to/file.ext
    ↓
Bucket Validation
    ↓
S3 GetObject
    ↓
Stream File with Headers
    ↓
1-year Cache Headers
    ↓
[No Authentication Required]
```

## Core Components

### Server (src/server.ts)

- Express application setup
- Middleware registration
- Static file serving (GUI)
- Rate limiter initialization
- Error handling

### S3 Service (src/services/s3.service.ts)

Singleton service providing:
- `getObject(bucket, key)` - Download file
- `listObjects(bucket, prefix, token)` - List files with pagination
- `uploadFile(bucket, key, body, contentType)` - Upload file
- `deleteFile(bucket, key)` - Delete file
- `moveFile(bucket, source, target)` - Rename/move file
- `copyFile(bucket, source, target)` - Copy file
- `getFileMetadata(bucket, key)` - Get metadata

All methods:
1. Validate bucket against whitelist
2. Handle S3 SDK operations
3. Throw descriptive errors

### Authentication (src/middleware/auth.ts)

Session management using in-memory Map:

```typescript
interface Session {
  token: string;
  expiry: number; // Unix timestamp
}

sessions: Map<string, Session>
```

Functions:
- `generateSessionToken()` - Create random 64-char token
- `createSession()` - Add session with 1-hour TTL
- `validateToken(token)` - Check if token is valid/not expired
- `verifyPassword(password)` - Compare with PRIVATE_TOKEN
- `authMiddleware()` - Route protection
- `optionalAuthMiddleware()` - Optional auth (log current status)

Auto-cleanup: 10% chance on token creation to remove expired sessions

### Rate Limiting (src/middleware/rateLimiter.ts)

Two limiters configured:

1. **Auth Limiter** (10 req / 30 min per IP)
   - Applied to `/api/auth/login`
   - Prevents brute force attacks

2. **API Limiter** (100 req / minute per IP)
   - Applied to file operations
   - Skips file proxy routes

Redis Support:
- If REDIS_URL configured: distributed across instances
- If no Redis: in-memory per instance
- Graceful fallback if Redis unavailable

### API Routes (src/routes/api.ts)

#### POST /api/auth/login
```json
Request:
{
  "password": "your_password"
}

Response (200):
{
  "success": true,
  "sessionToken": "abc123..."
}

Response (401):
{
  "success": false,
  "error": "Invalid password"
}
```

#### GET /api/buckets
```json
Response:
{
  "success": true,
  "buckets": ["bucket1", "bucket2"],
  "authenticated": false
}
```

#### GET /api/buckets/:bucketName/files?prefix=path/
```json
Response:
{
  "success": true,
  "data": {
    "files": [
      {
        "key": "path/to/file.txt",
        "size": 1024,
        "lastModified": "2024-01-01T00:00:00Z",
        "eTag": "abc123"
      }
    ],
    "continuationToken": "next_page_token"
  }
}
```

#### POST /api/buckets/:bucketName/upload
```
Form Data:
- file: <binary>
- key: path/to/file.txt

Response (200):
{
  "success": true,
  "message": "File uploaded successfully",
  "key": "path/to/file.txt"
}
```

#### DELETE /api/buckets/:bucketName/files/:fileKey
```json
Response:
{
  "success": true,
  "message": "File deleted successfully"
}
```

#### POST /api/buckets/:bucketName/move
```json
Request:
{
  "sourceKey": "old/path/file.txt",
  "targetKey": "new/path/file.txt"
}

Response:
{
  "success": true,
  "message": "File moved successfully"
}
```

#### POST /api/buckets/:bucketName/copy
```json
Request:
{
  "sourceKey": "original/file.txt",
  "targetKey": "copy/file.txt"
}

Response:
{
  "success": true,
  "message": "File copied successfully"
}
```

### Proxy Routes (src/routes/proxy.ts)

Pattern: `/:bucketName/*`

Operations:
1. Validate bucket against whitelist
2. Fetch file from S3
3. Set appropriate headers:
   - `Content-Type`: From S3 or MIME detection
   - `Content-Length`: File size
   - `Cache-Control`: 1 year
4. Stream response
5. Handle 404 errors

No authentication required - buckets are "public" via proxy.

### Web GUI (src/public/index.html)

Single-page application with:

**Components:**
- Login form
- File browser with breadcrumbs
- File grid with drag-drop upload
- Modals for operations
- File statistics

**Features:**
- Drag-and-drop upload
- Folder navigation
- File operations (delete, rename, copy)
- Search/filter by prefix
- Responsive design
- Error/success notifications

**State Management:**
```typescript
state = {
  authenticated: boolean,
  currentBucket: string,
  currentPath: string,
  files: File[],
  selectedFile: File | null
}
```

## Configuration

### Environment Variables

```env
# Required
ACCESS_KEY_ID=key
SECRET_ACCESS_KEY=secret
BUCKET_NAMES=bucket1,bucket2
ENDPOINT=https://s3.example.com
PRIVATE_TOKEN=password

# Optional
REGION=us-east-1
PORT=3000
NODE_ENV=development
RATE_LIMIT_WINDOW_MS=1800000
RATE_LIMIT_MAX_REQUESTS=10
REDIS_URL=redis://localhost:6379
```

### Bucket Whitelist

Only buckets in `BUCKET_NAMES` can be accessed. This prevents:
- Accessing unexpected buckets
- Accidental exposure of private buckets
- Unauthorized S3 resource usage

## Security Considerations

### Authentication
- Password validation on every request
- Session tokens stored in HttpOnly cookies
- Automatic session expiration (1 hour)
- Tokens are cryptographically secure random

### Authorization
- Bucket whitelist validation on all operations
- Only authenticated users can modify files
- File proxy is intentionally public (buckets are "static" assets)

### Rate Limiting
- Auth endpoint: 10 attempts per 30 minutes
- API endpoints: 100 requests per minute
- Based on client IP address
- Redis-backed for multi-instance deployments

### Input Validation
- Bucket names checked against whitelist
- File keys validated for path traversal
- Content-Type validation for uploads
- File size limits (100MB max by default)

### HTTPS/TLS
- Configure reverse proxy (Nginx, Traefik)
- Set `NODE_ENV=production`
- Use secure cookies (automatic with HTTPS)

## Performance

### File Serving
- Streaming (no buffering)
- Range request support (from S3)
- Long-lived cache headers (1 year)
- CDN-friendly

### Scalability
- Stateless (sessions in memory or Redis)
- Horizontal scaling with load balancer + Redis
- S3 provides unlimited storage
- Rate limiting per IP across all instances

### Optimization
- Lazy pagination (1000 items per request)
- Single-page app (no page reloads)
- Gzip compression
- HTTP caching headers

## Deployment

### Local Development

```bash
npm install
npm run dev
```

### Docker

```bash
docker-compose up -d
```

Includes:
- File server on port 3000
- Redis on port 6379
- Health checks
- Auto-restart

### Production (Kubernetes)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: file-server
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: file-server
        image: signalor-file-server:latest
        env:
        - name: REDIS_URL
          value: redis://redis-service:6379
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /api/buckets
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/buckets
```

### Logs

```bash
# Development
npm run dev 2>&1 | tee file-server.log

# Docker
docker-compose logs -f file-server
```

### Metrics to Monitor
- Rate limit rejections
- S3 API errors
- Session count
- Request latency
- File upload/download volume

## Future Enhancements

- [ ] Multi-user support with per-user buckets
- [ ] File search/indexing
- [ ] Batch operations
- [ ] Audit logging
- [ ] S3 event notifications
- [ ] Server-side encryption
- [ ] Access control lists (ACLs)
- [ ] Backup/restore functionality
- [ ] File versioning
- [ ] WebSocket real-time updates
