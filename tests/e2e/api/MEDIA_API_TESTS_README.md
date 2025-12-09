# Media Service API Tests

## Overview

Comprehensive E2E API tests for the Flamoral Dating Platform Media Service covering all 4 main endpoints:

1. **POST /api/media/upload** - Photo upload endpoint
2. **GET /api/media/presigned-url** - Get presigned upload URL (if implemented)
3. **POST /api/media/videos/upload** - Video upload endpoint
4. **POST /api/media/voice-notes/upload** - Voice note upload endpoint

## Test Coverage

### Photo Upload Tests (POST /api/media/upload)

#### Successful Uploads
- ✅ Upload valid JPEG images
- ✅ Upload PNG images
- ✅ Upload WebP images
- ✅ Upload and set as profile photo

#### File Size Validations
- ✅ Reject files exceeding 10MB limit
- ✅ Accept files at the size limit (10MB)

#### File Type Validations
- ✅ Reject invalid file types (PDF, text files)
- ✅ Reject corrupted image files
- ✅ Validate proper MIME types

#### Missing File Validations
- ✅ Fail when no file is attached
- ✅ Fail when wrong field name is used

#### Authentication
- ✅ Fail without authentication token
- ✅ Fail with invalid authentication token
- ✅ Fail with malformed authorization header

### Video Upload Tests (POST /api/media/videos/upload)

#### Successful Uploads
- ✅ Upload valid MP4 videos
- ✅ Upload profile video type
- ✅ Upload prompt video type

#### Video Size Validations
- ✅ Reject videos exceeding 100MB limit
- ✅ Accept videos at the size limit (100MB)

#### Video Format Validations
- ✅ Reject invalid video formats
- ✅ Reject non-video files

#### Missing Video Validations
- ✅ Fail when no video file is attached

#### Authentication
- ✅ Fail without authentication

### Voice Note Upload Tests (POST /api/media/voice-notes/upload)

#### Successful Uploads
- ✅ Upload valid MP3 voice notes
- ✅ Upload WAV audio format
- ✅ Upload M4A audio format
- ✅ Upload with profile context
- ✅ Upload with prompt context
- ✅ Upload with message context

#### Audio Format Validations
- ✅ Reject invalid audio formats
- ✅ Reject non-audio files

#### Audio Size Validations
- ✅ Reject audio files exceeding 10MB limit
- ✅ Accept audio at the size limit (10MB)

#### Missing Audio Validations
- ✅ Fail when no audio file is attached

#### Authentication
- ✅ Fail without authentication
- ✅ Fail with invalid token

### Additional Operations Tests

#### Retrieval Operations
- ✅ GET /api/media/photos - Get user photos
- ✅ GET /api/media/photos/:id - Get specific photo
- ✅ GET /api/media/videos - Get user videos
- ✅ GET /api/media/voice-notes - Get user voice notes with filtering

#### Delete Operations
- ✅ DELETE /api/media/photos/:id - Delete photo with ownership validation

### Error Handling & Edge Cases
- ✅ Handle concurrent uploads gracefully
- ✅ Handle malformed multipart data
- ✅ Validate content-type headers

## Running the Tests

### Prerequisites

1. Ensure services are running:
   ```bash
   # Auth Service (Port 3001)
   cd backend/services/auth-service
   npm run dev

   # Media Service (Port 3005)
   cd backend/services/media-service
   npm run dev
   ```

2. Ensure dependencies are installed:
   ```bash
   cd tests
   npm install
   ```

### Run All Media API Tests

```bash
# From the project root
npm test tests/e2e/api/media-api.spec.ts

# Or with Jest directly
npx jest tests/e2e/api/media-api.spec.ts --verbose
```

### Run Specific Test Suites

```bash
# Photo upload tests only
npx jest tests/e2e/api/media-api.spec.ts -t "Photo Upload"

# Video upload tests only
npx jest tests/e2e/api/media-api.spec.ts -t "Video Upload"

# Voice note tests only
npx jest tests/e2e/api/media-api.spec.ts -t "Voice Note Upload"

# Authentication tests across all endpoints
npx jest tests/e2e/api/media-api.spec.ts -t "Authentication"
```

### Run with Coverage

```bash
npx jest tests/e2e/api/media-api.spec.ts --coverage
```

### Run in Watch Mode

```bash
npx jest tests/e2e/api/media-api.spec.ts --watch
```

## Environment Configuration

### Environment Variables

Create a `.env` file in the tests directory:

```env
# Service URLs
MEDIA_API_URL=http://localhost:3005
AUTH_URL=http://localhost:3001

# Test User Credentials (optional)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

# Media Service Config
MAX_FILE_SIZE=10485760          # 10MB in bytes
MAX_VIDEO_FILE_SIZE=104857600   # 100MB in bytes
MAX_VIDEO_DURATION=60           # 60 seconds
```

### Port Configuration

| Service | Default Port | Environment Variable |
|---------|-------------|---------------------|
| Auth Service | 3001 | AUTH_URL |
| Media Service | 3005 | MEDIA_API_URL |

## Test File Structure

```
tests/e2e/api/
├── media-api.spec.ts           # Main test file
├── fixtures/                   # Test file fixtures (auto-generated)
│   └── (generated test files)
└── MEDIA_API_TESTS_README.md  # This file
```

## Test Fixtures

The test suite automatically generates the following test fixtures in memory:

### Image Fixtures
- **JPEG** - Minimal valid JPEG image (configurable size)
- **PNG** - Minimal valid PNG image
- **WebP** - Minimal valid WebP image

### Video Fixtures
- **MP4** - Minimal valid MP4 video (configurable size)

### Audio Fixtures
- **MP3** - Minimal valid MP3 audio (configurable size)
- **WAV** - Minimal valid WAV audio
- **M4A** - Minimal valid M4A audio

### Invalid Fixtures
- Corrupted files
- Text files
- Files with wrong MIME types

## Expected Responses

### Successful Photo Upload (201)
```json
{
  "success": true,
  "message": "Photo uploaded successfully",
  "data": {
    "id": "uuid",
    "userId": "user-id",
    "fileName": "filename.jpg",
    "mimeType": "image/jpeg",
    "size": 500000,
    "urls": {
      "thumbnail": "https://cdn.example.com/thumb.jpg",
      "standard": "https://cdn.example.com/standard.jpg",
      "hd": "https://cdn.example.com/hd.jpg",
      "original": "https://cdn.example.com/original.jpg"
    },
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "isProfilePhoto": false,
    "moderationStatus": "PENDING",
    "uploadedAt": "2025-12-09T12:00:00.000Z"
  }
}
```

### Successful Video Upload (201)
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "id": "uuid",
    "userId": "user-id",
    "fileName": "video.mp4",
    "videoType": "profile",
    "urls": {
      "video": "https://cdn.example.com/video.mp4",
      "thumbnail": "https://cdn.example.com/thumb.jpg"
    },
    "duration": 15.5,
    "uploadedAt": "2025-12-09T12:00:00.000Z"
  }
}
```

### Successful Voice Note Upload (201)
```json
{
  "success": true,
  "message": "Voice note uploaded successfully",
  "data": {
    "id": "uuid",
    "userId": "user-id",
    "fileName": "voice.mp3",
    "context": "profile",
    "url": "https://cdn.example.com/voice.mp3",
    "duration": 10.2,
    "uploadedAt": "2025-12-09T12:00:00.000Z"
  }
}
```

### Error Response (400/401/404)
```json
{
  "success": false,
  "error": "Error message"
}
```

## Common Issues & Troubleshooting

### Issue: Tests Timeout

**Solution:**
- Increase Jest timeout in test file (already set to 30-60s for uploads)
- Check if Media Service is running
- Verify Azure Storage/Azurite is accessible

### Issue: Authentication Failures

**Solution:**
- Ensure Auth Service is running on port 3001
- Check that test user registration is successful
- Verify JWT token generation

### Issue: File Size Limit Errors

**Solution:**
- Default limits are 10MB for photos/audio, 100MB for videos
- Check `MAX_FILE_SIZE` and `MAX_VIDEO_FILE_SIZE` environment variables
- Verify multer configuration in Media Service

### Issue: Azure Storage Errors

**Solution:**
- For local development, use Azurite (Azure Storage Emulator)
- Start Azurite: `azurite --silent --location /tmp/azurite --debug /tmp/azurite/debug.log`
- Or use Docker: `docker run -p 10000:10000 mcr.microsoft.com/azure-storage/azurite`

## Test Execution Timeline

Typical test execution times (on standard hardware):

- Photo Upload Tests: ~2-3 minutes
- Video Upload Tests: ~3-5 minutes (due to larger files)
- Voice Note Tests: ~2-3 minutes
- Additional Operations: ~1 minute
- **Total**: ~10-15 minutes

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Media API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      azurite:
        image: mcr.microsoft.com/azure-storage/azurite
        ports:
          - 10000:10000

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          npm install
          cd tests && npm install

      - name: Start services
        run: |
          npm run start:auth &
          npm run start:media &
          sleep 10

      - name: Run Media API tests
        run: npx jest tests/e2e/api/media-api.spec.ts
        env:
          MEDIA_API_URL: http://localhost:3005
          AUTH_URL: http://localhost:3001
```

## Test Maintenance

### Adding New Tests

1. Follow existing test structure
2. Use descriptive test names
3. Include proper assertions
4. Handle async operations properly
5. Clean up created resources

### Updating Tests

When Media Service changes:

1. Update expected response structures
2. Adjust validation rules
3. Update file size/format limits
4. Modify authentication requirements
5. Update this README

## Contributing

When contributing to these tests:

1. Ensure all tests pass locally
2. Add tests for new features
3. Update documentation
4. Follow existing code style
5. Use meaningful commit messages

## License

Part of the Flamoral Dating Platform - All rights reserved.

## Contact

For questions or issues with these tests, please contact the platform team.
