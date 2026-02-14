# Friendly Bucket Names Feature

## Overview

Map long, ugly bucket names to short, user-friendly slugs for cleaner URLs.

Instead of:
```
http://example.com/bucket-23wedf/documents/report.pdf
http://example.com/tbdas54/image.jpg
```

Use:
```
http://example.com/documents/report.pdf
http://example.com/media/image.jpg
```

## Configuration

### Setup

Add `FRIENDLY_BUCKET_NAMES` to your `.env`:

```env
BUCKET_NAMES=bucket-23wedf,tbdas54,documents-234rfed
FRIENDLY_BUCKET_NAMES=documents,media,profiles
```

### Requirements

1. **Must match count**: `FRIENDLY_BUCKET_NAMES` must have exactly as many items as `BUCKET_NAMES`
2. **Mapped in order**: First friendly name maps to first bucket name, etc.
3. **Optional**: If not provided, actual bucket names are used in URLs

### Examples

#### Example 1: E-commerce Site
```env
BUCKET_NAMES=bkt-prod-2024,bkt-staging-2024,cdn-images
FRIENDLY_BUCKET_NAMES=files,staging,media
```

Access:
- `https://example.com/files/invoice.pdf` → `bkt-prod-2024`
- `https://example.com/staging/test.pdf` → `bkt-staging-2024`
- `https://example.com/media/logo.png` → `cdn-images`

#### Example 2: SaaS Platform
```env
BUCKET_NAMES=uuid-e4d8a51a,uuid-7b2c8f9e,uuid-c3f6d2b1
FRIENDLY_BUCKET_NAMES=documents,backups,reports
```

Access:
- `https://example.com/documents/...` → `uuid-e4d8a51a`
- `https://example.com/backups/...` → `uuid-7b2c8f9e`
- `https://example.com/reports/...` → `uuid-c3f6d2b1`

## API Usage

All endpoints accept both friendly and actual bucket names:

### Web GUI

The GUI automatically displays friendly names:

```
Bucket selector shows: "documents", "media", "profiles"
Internally uses: friendly name → resolved to actual bucket
```

### REST API Endpoints

```bash
# Using friendly name
curl http://example.com/api/buckets/documents/files

# Using actual bucket name (also works)
curl http://example.com/api/buckets/bucket-23wedf/files

# Both return the same result
```

### File Proxy

```bash
# Using friendly name (if configured)
curl http://example.com/documents/path/to/file.pdf

# Using actual bucket name (if no friendly name configured)
curl http://example.com/bucket-23wedf/path/to/file.pdf

# Both work interchangeably
```

### API Responses

#### GET /api/buckets

Returns bucket objects with both names:

```json
{
  "success": true,
  "buckets": [
    {
      "actual": "bucket-23wedf",
      "friendly": "documents"
    },
    {
      "actual": "tbdas54",
      "friendly": "media"
    },
    {
      "actual": "documents-234rfed",
      "friendly": "profiles"
    }
  ]
}
```

#### GET /api/buckets/:bucketName/files

Accepts both friendly and actual names:

```bash
# These are equivalent:
GET /api/buckets/documents/files
GET /api/buckets/bucket-23wedf/files
```

## Security Considerations

### What's Hidden
- Actual bucket names not exposed in UI
- Private bucket naming scheme kept secret
- Friendly names can be changed without changing bucket names

### What's Not Hidden
- Bucket contents are still publicly accessible via proxy (as intended)
- Anyone with the friendly name can access files
- Consider bucket names as not truly secret (they're in the environment)

### Access Control
- Friendly bucket names don't add any security
- Authentication/rate limiting still applies to same endpoints
- Use strong `PRIVATE_TOKEN` regardless of friendly names

## Troubleshooting

### Mismatch Error
```
Error: FRIENDLY_BUCKET_NAMES count (2) must match BUCKET_NAMES count (3)
```

**Solution**: Make sure both arrays have the same number of items.

```env
# Correct
BUCKET_NAMES=bucket1,bucket2,bucket3
FRIENDLY_BUCKET_NAMES=name1,name2,name3

# Wrong
BUCKET_NAMES=bucket1,bucket2,bucket3
FRIENDLY_BUCKET_NAMES=name1,name2
```

### 404 Not Found
```
Error: Bucket not found
```

**Solution**: Verify the friendly name matches your configuration.

```env
# If configured as:
FRIENDLY_BUCKET_NAMES=documents,media,profiles

# These work:
/documents/file.pdf
/media/file.jpg
/profiles/avatar.png

# These don't:
/doc/file.pdf          # Wrong name
/bucket-23wedf/file.pdf # Only works if FRIENDLY_BUCKET_NAMES not configured
```

### GUI Shows Actual Names
```
Bucket selector shows: "bucket-23wedf", "tbdas54"
```

**Solution**: Ensure `.env` file was loaded and server restarted.

```bash
# Restart server
npm run dev

# Or in Docker:
docker-compose restart
```

## Comparison: With vs Without

### Without Friendly Names

```env
BUCKET_NAMES=bucket-prod,bucket-staging,bucket-cdn
# (FRIENDLY_BUCKET_NAMES not configured)
```

URLs: `/bucket-prod/...`, `/bucket-staging/...`, `/bucket-cdn/...`
GUI: Shows "bucket-prod", "bucket-staging", "bucket-cdn"

### With Friendly Names

```env
BUCKET_NAMES=bucket-prod,bucket-staging,bucket-cdn
FRIENDLY_BUCKET_NAMES=files,staging,media
```

URLs: `/files/...`, `/staging/...`, `/media/...`
GUI: Shows "files", "staging", "media"
API also accepts: `/bucket-prod/...`, `/bucket-staging/...`, `/bucket-cdn/...`

## Migration Guide

### Adding Friendly Names to Existing Setup

1. Update `.env`:
   ```env
   # Before
   BUCKET_NAMES=my-bucket-1,my-bucket-2

   # After
   BUCKET_NAMES=my-bucket-1,my-bucket-2
   FRIENDLY_BUCKET_NAMES=documents,media
   ```

2. Restart server:
   ```bash
   npm run dev
   ```

3. Update external links (optional):
   - Old: `https://example.com/my-bucket-1/file.pdf`
   - New: `https://example.com/documents/file.pdf`
   - Both work, use whichever you prefer

### Changing Friendly Names

1. Just update `.env`:
   ```env
   # Before
   FRIENDLY_BUCKET_NAMES=documents,media

   # After
   FRIENDLY_BUCKET_NAMES=files,uploads
   ```

2. Restart server

3. Old URLs still work temporarily:
   - `/documents/file.pdf` → Doesn't resolve (removed mapping)
   - `/files/file.pdf` → Works (new mapping)
   - `/my-bucket-1/file.pdf` → Still works (actual name)

### Removing Friendly Names

1. Delete `FRIENDLY_BUCKET_NAMES` from `.env`
2. Restart server
3. URLs revert to: `/my-bucket-1/...`, `/my-bucket-2/...`

## Best Practices

### Naming

Use:
- Simple lowercase names: `documents`, `media`, `backups`
- Hyphens for multi-word: `user-profiles`, `log-files`
- Avoid spaces or special chars: `my documents`, `files@2024`

### Pattern 1: Purpose-Based
```env
BUCKET_NAMES=s3-prod-001,s3-prod-002,s3-prod-003
FRIENDLY_BUCKET_NAMES=documents,media,backups
```

### Pattern 2: Environment-Based
```env
BUCKET_NAMES=uuid-a1b2c3d4,uuid-e5f6g7h8
FRIENDLY_BUCKET_NAMES=prod,staging
```

### Pattern 3: Department-Based
```env
BUCKET_NAMES=bkt-eng,bkt-marketing,bkt-design
FRIENDLY_BUCKET_NAMES=engineering,marketing,design
```

## References

- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick setup guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
