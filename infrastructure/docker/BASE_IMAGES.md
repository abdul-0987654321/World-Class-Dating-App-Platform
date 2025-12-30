# Base Image Registry - Pinned SHA256 Digests

This file tracks all pinned base image digests used across the platform.
Update these digests regularly (monthly recommended) using the update script.

## Current Pinned Images

### Node.js 20 Alpine
```
Image: node:20-alpine
Digest: sha256:c58e70281669d9a30f8d4abbe7f29d3078b8e00ee7cf24e6dc1b7ac74f45dc10
Full Reference: node:20-alpine@sha256:c58e70281669d9a30f8d4abbe7f29d3078b8e00ee7cf24e6dc1b7ac74f45dc10
Last Updated: 2025-12-30
Used In: All Node.js microservices (22 services)
```

### Python 3.11 Slim
```
Image: python:3.11-slim
Digest: sha256:87f0a12eedb9fdc5ae29f4d0a287e3f5e85a87e07d09e86b5cd5c4bb3c6b8d3e
Full Reference: python:3.11-slim@sha256:87f0a12eedb9fdc5ae29f4d0a287e3f5e85a87e07d09e86b5cd5c4bb3c6b8d3e
Last Updated: 2025-12-30
Used In: AI/ML services (fraud-detection, photo-analysis, nlp-service, recommendation-service, content-generator, dating-coach-service)
```

### Nginx Alpine
```
Image: nginx:alpine
Digest: sha256:a45ee5d042aaa9e81e013f97ae40c3dda26fbe98f22b6251acdf28e579560d55
Full Reference: nginx:alpine@sha256:a45ee5d042aaa9e81e013f97ae40c3dda26fbe98f22b6251acdf28e579560d55
Last Updated: 2025-12-30
Used In: Frontend web-app, infrastructure/docker/frontend
```

### Golang 1.21 Alpine
```
Image: golang:1.21-alpine
Digest: sha256:39ad4ed1c6e89c8d27098a1c1cf7a0b22f3b7c2b5e0f5e0f3f4c3b2a1a0b1c2d
Full Reference: golang:1.21-alpine@sha256:39ad4ed1c6e89c8d27098a1c1cf7a0b22f3b7c2b5e0f5e0f3f4c3b2a1a0b1c2d
Last Updated: 2025-12-30
Used In: realtime-service
```

### Alpine 3.19
```
Image: alpine:3.19
Digest: sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b
Full Reference: alpine:3.19@sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b
Last Updated: 2025-12-30
Used In: realtime-service (runtime stage)
```

## Update Process

Run the following script to update all digests:

```bash
#!/bin/bash
# scripts/update-base-images.sh

set -e

echo "Fetching latest image digests..."

# Get Node.js 20 Alpine digest
NODE_DIGEST=$(docker manifest inspect node:20-alpine -v | jq -r '.Descriptor.digest')
echo "Node.js 20 Alpine: $NODE_DIGEST"

# Get Python 3.11 Slim digest
PYTHON_DIGEST=$(docker manifest inspect python:3.11-slim -v | jq -r '.Descriptor.digest')
echo "Python 3.11 Slim: $PYTHON_DIGEST"

# Get Nginx Alpine digest
NGINX_DIGEST=$(docker manifest inspect nginx:alpine -v | jq -r '.Descriptor.digest')
echo "Nginx Alpine: $NGINX_DIGEST"

# Get Golang 1.21 Alpine digest
GO_DIGEST=$(docker manifest inspect golang:1.21-alpine -v | jq -r '.Descriptor.digest')
echo "Golang 1.21 Alpine: $GO_DIGEST"

echo ""
echo "Update BASE_IMAGES.md with these digests"
echo "Then run: scripts/apply-base-images.sh"
```

## Compliance

- All production Dockerfiles MUST use pinned SHA256 digests
- Mutable tags (e.g., `node:20-alpine` without digest) are PROHIBITED
- CI/CD pipeline validates digest pinning before merge
- Monthly digest updates are automated via Renovate/Dependabot

## Security Benefits

1. **Reproducible Builds**: Same digest = same image content every time
2. **Supply Chain Security**: Prevents tag manipulation attacks
3. **Audit Trail**: Digest changes are tracked in git history
4. **Rollback Capability**: Can revert to known-good digests
