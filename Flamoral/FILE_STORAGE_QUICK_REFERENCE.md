# File Storage - Quick Reference Guide

**Quick access guide for file upload and storage features**

---

## 🚀 Quick Start

### Enable WebP Compression

```bash
# .env
ENABLE_WEBP=true
IMAGE_OUTPUT_FORMAT=webp
```

### Configure CORS

```bash
# .env
AZURE_STORAGE_CORS_ORIGINS=https://flamoral.com,https://www.flamoral.com
```

---

## 📦 Common Operations

### Generate Presigned URL

```typescript
import azureStorageService from './infrastructure/storage/azure-storage.service';

// Read-only URL (60 min expiry)
const url = await azureStorageService.generatePresignedUrl('path/to/file.jpg', 60);

// Upload URL (30 min expiry)
const uploadUrl = await azureStorageService.generateUploadPresignedUrl('path/to/upload.jpg', 30);
```

### Validate File Upload

```typescript
import fileValidationUtil from './utils/file-validation.util';

const result = fileValidationUtil.performSecurityCheck(
  buffer,
  filename,
  declaredMimeType,
  'image' // or 'video', 'audio'
);

if (!result.isValid) {
  throw new Error(result.error);
}
```

### Check Storage Health

```typescript
const health = await azureStorageService.getHealthCheck();
console.log(health.status); // 'healthy', 'degraded', or 'unhealthy'
```

### Cleanup Old Media

```typescript
import blobLifecycleUtil from './utils/blob-lifecycle.util';

// Dry run first
const result = await blobLifecycleUtil.cleanupOldUnverifiedMedia(30, true);
console.log(`Would delete ${result.deletedCount} items`);

// Actually delete
await blobLifecycleUtil.cleanupOldUnverifiedMedia(30, false);
```

### Delete User Media

```typescript
// Delete all media for a user
await blobLifecycleUtil.deleteUserMedia(userId, false);
```

### Calculate Storage Usage

```typescript
const usage = await blobLifecycleUtil.calculateUserStorageUsage(userId);
console.log(`Files: ${usage.count}, Size: ${usage.totalSize} bytes`);
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=your-account
AZURE_STORAGE_ACCOUNT_KEY=your-key
AZURE_CONTAINER_NAME=media
AZURE_CDN_URL=https://cdn.flamoral.com

# Image Processing
IMAGE_OUTPUT_FORMAT=webp
ENABLE_WEBP=true

# CORS
AZURE_STORAGE_CORS_ORIGINS=https://flamoral.com
AZURE_STORAGE_CORS_MAX_AGE=3600

# Upload Limits
MAX_FILE_SIZE=10485760
MAX_PHOTOS_PER_USER=9
```

---

## 🛡️ Security Features

### Magic Number Validation

Supported file types:
- **Images:** JPEG, PNG, GIF, WebP, BMP, TIFF
- **Videos:** MP4, MOV, AVI, WebM
- **Audio:** MP3, WAV, M4A

### Malicious Pattern Detection

Automatically blocks:
- PHP code
- Script tags
- Eval patterns
- SQL injection attempts

---

## 📊 File Size Comparison

| Size Type  | JPEG  | WebP  | Savings |
|------------|-------|-------|---------|
| Thumbnail  | 15 KB | 10 KB | 33%     |
| Standard   | 120 KB| 75 KB | 38%     |
| HD         | 450 KB| 280 KB| 38%     |

---

## 🔍 Health Check Statuses

- **healthy** - All systems operational
- **degraded** - Storage working, CDN down
- **unhealthy** - Storage not initialized

---

## 📝 Route Examples

### Upload with Validation

```typescript
import { upload, validateUploadedFile } from './middleware/upload.middleware';

router.post(
  '/upload',
  upload.single('photo'),
  validateUploadedFile('image'),
  uploadController.uploadPhoto
);
```

### Multiple File Upload

```typescript
import { uploadMultiple, validateUploadedFiles } from './middleware/upload.middleware';

router.post(
  '/upload-multiple',
  uploadMultiple.array('photos', 9),
  validateUploadedFiles('image'),
  uploadController.uploadMultiplePhotos
);
```

---

## 🧪 Testing Commands

```bash
# Test file upload
curl -X POST http://localhost:3006/api/media/upload \
  -F "photo=@test.jpg" \
  -H "Authorization: Bearer $TOKEN"

# Check storage health
curl http://localhost:3006/api/media/health/storage

# Get storage usage
curl http://localhost:3006/api/media/usage \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🚨 Troubleshooting

### Uploads Failing
```bash
# Check environment
echo $AZURE_STORAGE_ACCOUNT_NAME
echo $AZURE_STORAGE_ACCOUNT_KEY

# Verify container exists
az storage container exists --name media
```

### CDN Not Working
```typescript
// Test CDN
const health = await azureStorageService.getHealthCheck();
console.log(health.cdn);
```

### CORS Errors
```typescript
// Reconfigure CORS
await azureStorageService.configureCORS();
```

---

## 📚 Key Files

- **Storage Service:** `src/infrastructure/storage/azure-storage.service.ts`
- **File Validation:** `src/utils/file-validation.util.ts`
- **Lifecycle Management:** `src/utils/blob-lifecycle.util.ts`
- **Upload Middleware:** `src/api/middleware/upload.middleware.ts`
- **Image Processing:** `src/domain/services/image-processing.service.ts`

---

## ⚡ Performance Tips

1. **Enable WebP** for 35-40% smaller files
2. **Use CDN URLs** for faster delivery
3. **Set proper cache headers** (already configured)
4. **Generate presigned URLs** for private content
5. **Run cleanup regularly** to remove orphaned blobs

---

**For detailed information, see:** `FILE_STORAGE_FIXES_COMPLETE.md`
