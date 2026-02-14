# Signalor Static File Server

A comprehensive S3-compatible bucket file server with web GUI, password authentication, rate limiting, and public file proxy.

## Features

- **Password-protected GUI** with 1-hour session TTL
- **Rate limiting** (10 requests per 30 minutes for auth, configurable)
- **Full file management** - upload, download, delete, move, rename files
- **Folder navigation** with breadcrumb UI
- **Public file proxy** at `/bucketname/path/to/file.ext`
- **Friendly bucket names** - map ugly bucket names to pretty URLs
- **Multi-bucket support** with separate namespace
- **Modern responsive web GUI**
- **File statistics** (count, total size, current path)
- **Redis support** for distributed rate limiting
- **S3-compatible** (AWS S3, MinIO, DigitalOcean Spaces, etc.)

## Installation

```bash
cd static
npm install
```

## Configuration

Create a `.env` file in the `static` directory:

```env
# S3-Compatible Bucket Configuration
ACCESS_KEY_ID=your_access_key_id
SECRET_ACCESS_KEY=your_secret_access_key
BUCKET_NAMES=bucket-23wedf,tbdas54,documents-234rfed
FRIENDLY_BUCKET_NAMES=documents,media,profiles
ENDPOINT=https://s3-endpoint.example.com
REGION=us-east-1

# Authentication (password for GUI access)
PRIVATE_TOKEN=your_secure_password_token

# Server Configuration
PORT=3000
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=1800000
RATE_LIMIT_MAX_REQUESTS=10

# Redis (optional, for distributed rate limiting)
REDIS_URL=redis://localhost:6379
```

### Environment Variables

- **ACCESS_KEY_ID** (required): S3 access key
- **SECRET_ACCESS_KEY** (required): S3 secret access key
- **BUCKET_NAMES** (required): Comma-separated bucket names (e.g., `bucket1,bucket2,bucket3`)
- **FRIENDLY_BUCKET_NAMES** (optional): Comma-separated friendly names for buckets (must match count of BUCKET_NAMES)
  - Maps actual bucket names to user-friendly slugs
  - E.g., `BUCKET_NAMES=bucket-23wedf,tbdas54,documents-234rfed` → `FRIENDLY_BUCKET_NAMES=documents,media,profiles`
  - Access via `/documents/file.ext` instead of `/bucket-23wedf/file.ext`
  - If not provided, actual bucket names are used in URLs
- **ENDPOINT** (required): S3 endpoint URL
- **REGION** (optional): AWS region, defaults to `us-east-1`
- **PRIVATE_TOKEN** (required): Password to access the GUI
- **PORT** (optional): Server port, defaults to `3000`
- **NODE_ENV** (optional): `development` or `production`
- **RATE_LIMIT_WINDOW_MS** (optional): Rate limit window in milliseconds, defaults to `1800000` (30 minutes)
- **RATE_LIMIT_MAX_REQUESTS** (optional): Max requests per window, defaults to `10`
- **REDIS_URL** (optional): Redis URL for distributed rate limiting

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## Usage

### Web GUI

1. Open http://localhost:3000
2. Enter the password (PRIVATE_TOKEN)
3. Select a bucket
4. Browse, upload, delete, and manage files

### File Proxy

Access files directly via HTTP using either actual or friendly bucket names:

```
# Using friendly name (if configured)
http://localhost:3000/documents/path/to/file.ext

# Using actual bucket name
http://localhost:3000/bucket-23wedf/path/to/file.ext
```

Files served via the proxy are cached for 1 year. No authentication required.

#### Friendly Bucket Names

Configure `FRIENDLY_BUCKET_NAMES` to use pretty URLs:

```env
BUCKET_NAMES=bucket-23wedf,tbdas54,documents-234rfed
FRIENDLY_BUCKET_NAMES=documents,media,profiles
```

Then access files as:
- `http://localhost:3000/documents/file.pdf` instead of `http://localhost:3000/bucket-23wedf/file.pdf`
- `http://localhost:3000/media/image.jpg` instead of `http://localhost:3000/tbdas54/image.jpg`
- `http://localhost:3000/profiles/avatar.png` instead of `http://localhost:3000/documents-234rfed/avatar.png`

Both friendly and actual names work in all API endpoints.

### API Endpoints

#### Authentication

- `POST /api/auth/login` - Get session token
  ```json
  {
    "password": "your_password"
  }
  ```

#### Files

- `GET /api/buckets` - List all buckets
- `GET /api/buckets/:bucketName/files?prefix=path/` - List files in bucket
- `POST /api/buckets/:bucketName/upload` - Upload file (requires auth)
  - Form data: `file`, `key`
- `DELETE /api/buckets/:bucketName/files/:fileKey` - Delete file (requires auth)
- `POST /api/buckets/:bucketName/move` - Move/rename file (requires auth)
  ```json
  {
    "sourceKey": "old/path/file.ext",
    "targetKey": "new/path/file.ext"
  }
  ```
- `POST /api/buckets/:bucketName/copy` - Copy file (requires auth)
  ```json
  {
    "sourceKey": "source/file.ext",
    "targetKey": "copy/file.ext"
  }
  ```

## Rate Limiting

- **Auth endpoint** (`/api/auth/login`): 10 requests per 30 minutes per IP
- **General API**: 100 requests per minute per IP
- **File proxy** (`/:bucketName/*`): No rate limit

Rate limiting is IP-based. With Redis configured, it works across multiple server instances.

## Security

1. **Password authentication** - PRIVATE_TOKEN must be strong
2. **Rate limiting** - Prevents brute force attacks
3. **Session TTL** - Sessions expire after 1 hour
4. **HttpOnly cookies** - Session tokens stored securely
5. **CORS** - Configured for your domain
6. **Input validation** - File keys validated against configured buckets

## Examples

### Upload file via API

```bash
curl -X POST http://localhost:3000/api/buckets/my-bucket/upload \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "key=documents/file.pdf"
```

### Move file via API

```bash
curl -X POST http://localhost:3000/api/buckets/my-bucket/move \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceKey": "old/file.pdf",
    "targetKey": "new/file.pdf"
  }'
```

### Access file via proxy

```bash
# Public access - no authentication required
https://your-domain.com/my-bucket/documents/file.pdf
```

## Troubleshooting

### "Invalid bucket" error

- Check BUCKET_NAMES environment variable
- Ensure bucket names match exactly (case-sensitive)
- Verify S3 credentials

### Rate limit exceeded

- Wait for the rate limit window to reset
- With Redis, limits are per IP across all instances
- Without Redis, limits are per server instance (in-memory)

### S3 connection issues

- Verify ENDPOINT URL is correct
- Check ACCESS_KEY_ID and SECRET_ACCESS_KEY
- Ensure S3 service is accessible from your network

## Architecture

```
static/
├── src/
│   ├── server.ts          # Main Express app
│   ├── config/
│   │   └── env.ts         # Environment configuration
│   ├── services/
│   │   └── s3.service.ts  # S3 operations
│   ├── middleware/
│   │   ├── auth.ts        # Authentication & sessions
│   │   └── rateLimiter.ts # Rate limiting
│   ├── routes/
│   │   ├── api.ts         # API endpoints
│   │   └── proxy.ts       # File proxy routes
│   └── public/
│       └── index.html     # Web GUI
├── dist/                  # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Performance Notes

- Files are streamed directly from S3 (no buffering)
- Upload uses multipart upload for large files
- Rate limiting uses Redis for distributed systems
- GUI lazy-loads files with pagination support (1000 files per request)
- Cache headers set to 1 year for file proxy

## License

MIT
