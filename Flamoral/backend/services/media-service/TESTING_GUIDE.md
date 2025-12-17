# Media Service Testing Guide

Quick reference for testing the media service after fixes have been applied.

## Prerequisites

1. Service is running: `npm run dev` or `npm start`
2. Port 3006 is accessible
3. For authenticated endpoints: Valid JWT token from auth service

## 1. Health Check Tests

### Basic Health Check
```bash
curl http://localhost:3006/health
```

**Expected Response** (200 OK):
```json
{
  "status": "healthy",
  "service": "media-service",
  "timestamp": "2025-12-15T..."
}
```

### Detailed Health Check
```bash
curl http://localhost:3006/health/detailed
```

**Expected Response When Healthy** (200 OK):
```json
{
  "status": "healthy",
  "service": "media-service",
  "timestamp": "2025-12-15T...",
  "storage": {
    "healthy": true,
    "initialized": true
  },
  "uptime": 123.456
}
```

**Expected Response When Degraded** (503 Service Unavailable):
```json
{
  "status": "degraded",
  "service": "media-service",
  "timestamp": "2025-12-15T...",
  "storage": {
    "healthy": false,
    "initialized": false,
    "error": "Azure Storage credentials not configured. Please set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY"
  },
  "uptime": 123.456
}
```

## 2. Upload Tests

### Get JWT Token First

From auth service:
```bash
# Login to get token
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Save the token
TOKEN="<access_token_from_response>"
```

### Upload a Photo

```bash
curl -X POST http://localhost:3006/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@/path/to/image.jpg" \
  -F "isProfilePhoto=false"
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "message": "Photo uploaded successfully",
  "data": {
    "id": "uuid-here",
    "userId": "user-uuid",
    "fileName": "uuid-image.jpg",
    "originalName": "image.jpg",
    "mimeType": "image/jpeg",
    "size": 123456,
    "urls": {
      "thumbnail": "https://cdn.flamoral.com/...-thumb.jpg",
      "standard": "https://cdn.flamoral.com/...-std.jpg",
      "hd": "https://cdn.flamoral.com/...-hd.jpg",
      "original": "https://cdn.flamoral.com/....jpg"
    },
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "isProfilePhoto": false,
    "isVerified": false,
    "moderationStatus": "pending",
    "uploadedAt": "2025-12-15T...",
    "updatedAt": "2025-12-15T..."
  }
}
```

### Upload as Profile Photo

```bash
curl -X POST http://localhost:3006/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@/path/to/profile.jpg" \
  -F "isProfilePhoto=true"
```

## 3. Get User Photos

```bash
curl http://localhost:3006/api/media/photos \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "userId": "user-uuid",
      "fileName": "photo1.jpg",
      ...
    },
    {
      "id": "uuid-2",
      "userId": "user-uuid",
      "fileName": "photo2.jpg",
      ...
    }
  ]
}
```

## 4. Get Specific Photo

```bash
PHOTO_ID="uuid-of-photo"
curl http://localhost:3006/api/media/photos/$PHOTO_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid-of-photo",
    "userId": "user-uuid",
    ...
  }
}
```

## 5. Set Profile Photo

```bash
PHOTO_ID="uuid-of-photo"
curl -X PUT http://localhost:3006/api/media/photos/$PHOTO_ID/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Profile photo updated successfully"
}
```

## 6. Delete Photo

```bash
PHOTO_ID="uuid-of-photo"
curl -X DELETE http://localhost:3006/api/media/photos/$PHOTO_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

## 7. Error Cases to Test

### Upload Without Token
```bash
curl -X POST http://localhost:3006/api/media/upload \
  -F "photo=@/path/to/image.jpg"
```

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "No token provided"
}
```

### Upload Invalid File Type
```bash
curl -X POST http://localhost:3006/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@/path/to/document.pdf"
```

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Invalid file type. Allowed: image/jpeg, image/jpg, image/png, image/webp"
}
```

### Upload Oversized File
```bash
# Upload file > 10MB
curl -X POST http://localhost:3006/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@/path/to/large-image.jpg"
```

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "File size exceeds limit of 10MB"
}
```

### Delete Non-Existent Photo
```bash
curl -X DELETE http://localhost:3006/api/media/photos/non-existent-uuid \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (404 Not Found):
```json
{
  "success": false,
  "error": "Photo not found"
}
```

### Delete Another User's Photo
```bash
# Try to delete a photo that belongs to a different user
curl -X DELETE http://localhost:3006/api/media/photos/$OTHER_USER_PHOTO_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (403 Forbidden):
```json
{
  "success": false,
  "error": "Forbidden"
}
```

## 8. Integration Tests

### Full Upload Workflow

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.accessToken')

# 2. Upload photo
PHOTO_RESPONSE=$(curl -s -X POST http://localhost:3006/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@test-image.jpg")

PHOTO_ID=$(echo $PHOTO_RESPONSE | jq -r '.data.id')

# 3. Get all photos
curl http://localhost:3006/api/media/photos \
  -H "Authorization: Bearer $TOKEN"

# 4. Set as profile photo
curl -X PUT http://localhost:3006/api/media/photos/$PHOTO_ID/profile \
  -H "Authorization: Bearer $TOKEN"

# 5. Get specific photo
curl http://localhost:3006/api/media/photos/$PHOTO_ID \
  -H "Authorization: Bearer $TOKEN"

# 6. Delete photo
curl -X DELETE http://localhost:3006/api/media/photos/$PHOTO_ID \
  -H "Authorization: Bearer $TOKEN"
```

## 9. Performance Tests

### Check Response Times

```bash
# Should be < 500ms for health check
time curl http://localhost:3006/health

# Upload time will vary based on image size and processing
time curl -X POST http://localhost:3006/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@test-image.jpg"
```

### Concurrent Uploads

```bash
# Test multiple concurrent uploads
for i in {1..5}; do
  curl -X POST http://localhost:3006/api/media/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "photo=@test-image-$i.jpg" &
done
wait
```

## 10. Log Monitoring

While testing, monitor the service logs:

```bash
# If running with npm run dev
# Logs will appear in the terminal

# Look for these patterns:
# - "Azure Storage initialized successfully" (good)
# - "Azure Storage initialized in degraded mode" (needs credentials)
# - "Photo uploaded successfully" (upload working)
# - "CORS blocked origin" (CORS issue)
```

## 11. Verify Azure Storage (Production)

If Azure Storage is configured:

```bash
# 1. Upload a photo
curl -X POST http://localhost:3006/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@test-image.jpg"

# 2. Check Azure Portal or use Azure CLI
az storage blob list \
  --account-name flamoralstorage \
  --container-name media \
  --output table

# 3. Verify URLs are accessible
# Copy a URL from the upload response and access it in browser
# Should see the image
```

## 12. Circuit Breaker Test (API Gateway)

If you have the API Gateway running:

```bash
# Check circuit breaker status
curl http://localhost:3001/health/circuits

# Look for media service circuit
# State should be "CLOSED" when healthy
```

## Test Results Checklist

- [ ] Basic health check returns 200
- [ ] Detailed health check shows storage status
- [ ] Photo upload works (201 Created)
- [ ] Uploaded files have correct URLs
- [ ] Get user photos returns correct data
- [ ] Set profile photo works
- [ ] Delete photo works
- [ ] Unauthorized requests return 401
- [ ] Invalid file types return 400
- [ ] Oversized files return 400
- [ ] CORS allows configured origins
- [ ] Service logs show no errors
- [ ] Circuit breaker state is CLOSED (if applicable)

## Troubleshooting

### Upload fails with "Azure Storage not initialized"

**Fix**: Check `/health/detailed` and verify Azure credentials are set

### CORS errors

**Fix**: Add your frontend URL to `CORS_ORIGINS` environment variable

### 401 Unauthorized

**Fix**: Get fresh JWT token from auth service, tokens expire

### Slow upload response

**Check**:
- Image size (should be < 10MB)
- Network connectivity to Azure
- Processing logs for bottlenecks

---

**Quick Test Script**:
```bash
#!/bin/bash
# Save as test-media-service.sh

echo "1. Testing health check..."
curl -s http://localhost:3006/health | jq

echo -e "\n2. Testing detailed health..."
curl -s http://localhost:3006/health/detailed | jq

echo -e "\n3. Login to get token..."
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.accessToken')

echo -e "\n4. Uploading photo..."
curl -s -X POST http://localhost:3006/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@test-image.jpg" | jq

echo -e "\n5. Getting user photos..."
curl -s http://localhost:3006/api/media/photos \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\nAll tests completed!"
```

Run with: `chmod +x test-media-service.sh && ./test-media-service.sh`
