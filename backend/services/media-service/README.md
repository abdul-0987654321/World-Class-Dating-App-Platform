# Media Service

Media upload, processing, and content moderation service for Flamoral dating platform.

## Features

- **Photo Upload** - Upload profile photos with automatic processing
- **Image Processing** - Automatic creation of multiple image sizes (thumbnail, standard, HD)
- **Content Moderation** - AI-powered inappropriate content detection using Azure Computer Vision
- **Cloud Storage** - Azure Blob Storage integration for scalable media storage
- **File Validation** - Type and size validation (max 10MB, JPEG/PNG/WebP)
- **Face Detection** - Ensures profile photos contain visible faces
- **Background Processing** - Queue-based processing for performance

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript
- **Framework**: Express.js
- **Image Processing**: Sharp
- **Cloud Storage**: Azure Blob Storage
- **AI/ML**: Azure Computer Vision API
- **Queue**: Bull (Redis-based)
- **File Upload**: Multer

## Architecture

```
src/
├── api/
│   ├── controllers/        # HTTP request handlers
│   ├── middleware/         # Auth, upload, validation
│   └── routes/            # API route definitions
├── config/                # Configuration management
├── domain/
│   ├── entities/          # Business entities
│   └── services/          # Business logic
│       ├── upload.service.ts
│       ├── image-processing.service.ts
│       └── content-moderation.service.ts
├── infrastructure/
│   ├── storage/           # Azure Storage integration
│   └── queue/             # Bull queue workers
├── types/                 # TypeScript type definitions
└── index.ts              # Application entry point
```

## API Endpoints

### Upload Photo
```http
POST /api/media/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "photo": <file>,
  "isProfilePhoto": boolean
}
```

### Get User Photos
```http
GET /api/media/photos
Authorization: Bearer <token>
```

### Get Specific Photo
```http
GET /api/media/photos/:id
```

### Delete Photo
```http
DELETE /api/media/photos/:id
Authorization: Bearer <token>
```

### Set Profile Photo
```http
PUT /api/media/photos/:id/profile
Authorization: Bearer <token>
```

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Azure credentials
   ```

3. **Run in Development**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port (default: 3004) | No |
| AZURE_STORAGE_ACCOUNT_NAME | Azure Storage account name | Yes |
| AZURE_STORAGE_ACCOUNT_KEY | Azure Storage access key | Yes |
| AZURE_CONTAINER_NAME | Blob container name | Yes |
| AZURE_CV_ENDPOINT | Computer Vision API endpoint | Yes |
| AZURE_CV_API_KEY | Computer Vision API key | Yes |
| JWT_ACCESS_SECRET | JWT secret for auth | Yes |
| REDIS_HOST | Redis host for Bull queue | Yes |
| MAX_FILE_SIZE | Max upload size in bytes | No |
| MAX_PHOTOS_PER_USER | Max photos per user | No |

## Image Processing

Uploaded images are automatically processed into multiple versions:

- **Thumbnail**: 200x200px (cover fit)
- **Standard**: 800x800px (max dimensions)
- **HD**: 1920x1920px (max dimensions)
- **Original**: Preserved original file

All versions are optimized and compressed to JPEG format at 85% quality.

## Content Moderation

Every uploaded photo is automatically analyzed for:

- **Adult Content** - Nudity and sexually explicit content
- **Racy Content** - Suggestive content
- **Violent Content** - Gore and violence
- **Face Detection** - Ensures profile photos contain faces

Moderation statuses:
- `pending` - Analysis in progress
- `approved` - Safe content, under thresholds
- `flagged` - Borderline content, requires manual review
- `rejected` - Inappropriate content, automatically deleted

## Security

- JWT-based authentication required for all upload/delete operations
- File type validation (JPEG, PNG, WebP only)
- File size limits (10MB default)
- Automatic scanning for inappropriate content
- User ownership verification for delete operations

## Error Handling

The service includes comprehensive error handling:

- File validation errors (type, size)
- Upload failures
- Processing errors
- Storage errors
- Authentication errors
- Moderation failures

All errors return consistent JSON format:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Future Enhancements

- [ ] Database integration for media metadata persistence
- [ ] Photo verification using face matching
- [ ] Video upload support
- [ ] Batch upload endpoints
- [ ] CDN integration
- [ ] Advanced image filters
- [ ] Watermarking
- [ ] EXIF data stripping for privacy

## License

Proprietary - Flamoral Platform
