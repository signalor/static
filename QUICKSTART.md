# Quick Start Guide

## Setup in 5 minutes

### 1. Configure Environment

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Edit `.env` with your S3 credentials:

```env
ACCESS_KEY_ID=your_key
SECRET_ACCESS_KEY=your_secret
BUCKET_NAMES=bucket-23wedf,tbdas54,documents-234rfed
FRIENDLY_BUCKET_NAMES=documents,media,profiles
ENDPOINT=https://s3-endpoint.com
PRIVATE_TOKEN=your_secure_password
PORT=3000
```

**Note:** `FRIENDLY_BUCKET_NAMES` is optional. Use it to map long bucket names to pretty URLs.

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### 4. Login & Use

1. Open http://localhost:3000 in your browser
2. Enter the password (value of `PRIVATE_TOKEN`)
3. Select a bucket
4. Upload, browse, and manage files

## Usage Examples

### Access Files Publicly

With friendly bucket names configured:

```
# Using friendly names
http://localhost:3000/documents/path/to/file.pdf
http://localhost:3000/media/documents/report.xlsx

# Using actual bucket names (also works)
http://localhost:3000/bucket-23wedf/path/to/file.pdf
http://localhost:3000/tbdas54/documents/report.xlsx
```

No authentication needed - these URLs work for anyone.

### Upload File via API

You can use either friendly or actual bucket names:

```bash
# Using friendly name
curl -X POST http://localhost:3000/api/buckets/documents/upload \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -F "file=@document.pdf" \
  -F "key=documents/document.pdf"

# Using actual bucket name
curl -X POST http://localhost:3000/api/buckets/bucket-23wedf/upload \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -F "file=@document.pdf" \
  -F "key=documents/document.pdf"
```

### Get Session Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_password"}'
```

## Deploy with Docker

### Single Command Deployment

```bash
docker-compose up -d
```

This starts:
- File server on port 3000
- Redis for distributed rate limiting

Shut down with:
```bash
docker-compose down
```

## Connect to Real S3 Services

### AWS S3

```env
ACCESS_KEY_ID=AKIA...
SECRET_ACCESS_KEY=...
BUCKET_NAMES=my-prod-bucket,my-dev-bucket
ENDPOINT=https://s3.amazonaws.com
REGION=us-east-1
PRIVATE_TOKEN=your_password
```

### MinIO (Local)

```env
ACCESS_KEY_ID=minioadmin
SECRET_ACCESS_KEY=minioadmin
BUCKET_NAMES=uploads
ENDPOINT=http://localhost:9000
REGION=us-east-1
PRIVATE_TOKEN=your_password
```

Start MinIO:
```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

### DigitalOcean Spaces

```env
ACCESS_KEY_ID=DO_SPACES_KEY
SECRET_ACCESS_KEY=DO_SPACES_SECRET
BUCKET_NAMES=my-space
ENDPOINT=https://nyc3.digitaloceanspaces.com
REGION=nyc3
PRIVATE_TOKEN=your_password
```

## Key Features

- 🔐 Password-protected GUI (1-hour session)
- ⚡ Rate limited (10 auth attempts per 30 minutes)
- 📁 Full file management (upload, delete, move, rename)
- 📂 Folder navigation
- 🔗 Public file proxy (no auth needed)
- 🪣 Multi-bucket support
- 📊 File statistics
- 🎨 Modern responsive UI

## File Structure

```
static/
├── src/
│   ├── server.ts              # Main Express server
│   ├── config/env.ts          # Environment config
│   ├── services/s3.service.ts # S3 operations
│   ├── middleware/
│   │   ├── auth.ts            # Authentication
│   │   └── rateLimiter.ts    # Rate limiting
│   ├── routes/
│   │   ├── api.ts             # API endpoints
│   │   └── proxy.ts           # File serving
│   └── public/index.html      # Web GUI
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/login` | POST | ❌ | Get session token |
| `/api/buckets` | GET | ❌ | List all buckets |
| `/api/buckets/:bucket/files` | GET | ❌ | List files |
| `/api/buckets/:bucket/upload` | POST | ✅ | Upload file |
| `/api/buckets/:bucket/files/:key` | DELETE | ✅ | Delete file |
| `/api/buckets/:bucket/move` | POST | ✅ | Move file |
| `/api/buckets/:bucket/copy` | POST | ✅ | Copy file |
| `/:bucket/*` | GET | ❌ | Download file |

✅ = Requires authentication via session cookie or Bearer token

## Troubleshooting

**Port already in use?**
```bash
npm run dev -- --port 3001
```

**Can't connect to S3?**
1. Check ENDPOINT is correct
2. Verify ACCESS_KEY_ID and SECRET_ACCESS_KEY
3. Test S3 connection: `aws s3 ls --endpoint-url $ENDPOINT`

**Rate limited?**
- Wait 30 minutes or change `RATE_LIMIT_WINDOW_MS` in `.env`

**Need to increase file upload size?**
- Edit `src/server.ts`, change `limit: '100mb'` to larger value

## Next Steps

- Read [README.md](README.md) for detailed documentation
- Deploy to production with Docker
- Configure HTTPS with nginx/traefik
- Add custom domain
- Set up monitoring/logging
