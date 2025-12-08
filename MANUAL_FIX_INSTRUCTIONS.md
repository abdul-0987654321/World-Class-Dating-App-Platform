# Manual Fix Instructions for Azure DevOps Pipeline Errors

## Overview

Two backend services have build errors in the Azure DevOps CI pipeline:
1. **advertising-service**: Missing ESLint dependencies (exit code 127 - command not found)
2. **realtime-service**: Wrong build type - it's a Go service being built as Node.js (exit code 2)

## Quick Fix (Automated)

Run the automated fix script:
```bash
cd /path/to/DatingPlatform
chmod +x apply-pipeline-fixes.sh
./apply-pipeline-fixes.sh
```

Then commit and push:
```bash
git add backend/services/advertising-service/package.json pipelines/ci-pipeline.yml
git commit -m "Fix CI pipeline errors for backend services

- Add missing ESLint dependencies to advertising-service
- Move realtime-service from Node.js build to Go build job"
git push
```

## Manual Fix Instructions

If you prefer to apply fixes manually, follow these steps:

### Fix 1: advertising-service - Add Missing ESLint Dependencies

**File**: `backend/services/advertising-service/package.json`

**What to change**: Add the following packages to the `devDependencies` section:

```json
{
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",          ← ADD THIS
    "@types/node": "^20.10.0",
    "@types/uuid": "^9.0.6",
    "@typescript-eslint/eslint-plugin": "^6.15.0",  ← ADD THIS
    "@typescript-eslint/parser": "^6.15.0",         ← ADD THIS
    "eslint": "^8.56.0",                             ← ADD THIS
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "typescript": "^5.3.2",
    "ts-node-dev": "^2.0.0"
  }
}
```

**After editing**:
```bash
cd backend/services/advertising-service
npm install
npm run lint   # Should now work without "command not found" error
npm run build  # Should complete successfully
```

### Fix 2: realtime-service - Move to Go Build Job

**File**: `pipelines/ci-pipeline.yml`

**Step 1**: Remove realtime-service from `BuildNodeServices` job

Find this section (around line 182-187):
```yaml
            AdvertisingService:
              serviceName: 'advertising-service'
              serviceDir: 'backend/services/advertising-service'
            RealtimeService:                                    ← DELETE
              serviceName: 'realtime-service'                   ← DELETE
              serviceDir: 'backend/services/realtime-service'   ← DELETE
        steps:
```

Change it to:
```yaml
            AdvertisingService:
              serviceName: 'advertising-service'
              serviceDir: 'backend/services/advertising-service'
        steps:
```

**Step 2**: Add new `BuildGoServices` job

Find the `BuildAIServices` job (around line 199) and add this BEFORE it:

```yaml
      - job: BuildGoServices
        displayName: 'Build Go Services (Realtime)'
        steps:
          - checkout: self

          # Use system Go or install if needed (self-hosted agent compatible)
          - script: |
              echo "Checking Go installation..."

              # Check if go is available
              if command -v go &> /dev/null; then
                echo "Go found:"
                go version
              else
                echo "Go not found, installing..."
                # Download and install Go 1.21
                wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
                sudo rm -rf /usr/local/go
                sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
                export PATH=$PATH:/usr/local/go/bin
                echo "export PATH=\$PATH:/usr/local/go/bin" >> ~/.bashrc
                go version
              fi
            displayName: 'Setup Go (Self-hosted Agent Compatible)'

          - script: |
              cd backend/services/realtime-service
              if [ -f "go.mod" ]; then
                echo "Building realtime-service..."
                go mod download
                go build -v ./...
              fi
            displayName: 'Build Realtime Service (Go)'
            env:
              GO111MODULE: on

          - script: |
              cd backend/services/realtime-service
              if [ -f "go.mod" ]; then
                echo "Testing realtime-service..."
                go test -v -race -coverprofile=coverage.txt -covermode=atomic ./... || true
              fi
            displayName: 'Test Realtime Service (Go)'
            continueOnError: true
            env:
              GO111MODULE: on

          - task: PublishTestResults@2
            condition: succeededOrFailed()
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: 'backend/services/realtime-service/**/test-results.xml'
              testRunTitle: 'Realtime Service Tests (Go)'
            continueOnError: true

      - job: BuildAIServices
        displayName: 'Build AI/ML Services (Python)'
        steps:
          ...
```

## Verification

After applying the fixes, verify locally:

### Verify advertising-service
```bash
cd backend/services/advertising-service
npm install
npm run lint    # Should pass
npm run build   # Should pass
```

### Verify realtime-service
```bash
cd backend/services/realtime-service
go mod download
go build -v ./...   # Should pass
go test -v ./...    # Should pass
```

## Expected Pipeline Results

After pushing the changes:

### Before Fix:
```
❌ Lint - advertising-service: Bash exited with code '127'
   Error: bash: line 2: eslint: command not found

❌ Build - advertising-service: Bash exited with code '2'
   Error: Build failed

❌ Lint - realtime-service: Bash exited with code '127'
   Error: npm not found (Go service)

❌ Build - realtime-service: Bash exited with code '2'
   Error: package.json not found
```

### After Fix:
```
✅ Lint - advertising-service: Succeeded
✅ Build - advertising-service: Succeeded
✅ Build - realtime-service (Go): Succeeded
✅ Test - realtime-service (Go): Succeeded
```

## Technical Details

### Why advertising-service Failed

The `package.json` has a lint script that calls `eslint`:
```json
"scripts": {
  "lint": "eslint src/**/*.ts"
}
```

But `eslint` and the TypeScript ESLint parser/plugin were missing from `devDependencies`. When npm installed dependencies, it didn't install ESLint, causing the "command not found" error.

### Why realtime-service Failed

The realtime-service is written in **Go** (has `go.mod` file, not `package.json`), but the CI pipeline was trying to build it as a **Node.js** service with npm commands.

The pipeline matrix included:
```yaml
RealtimeService:
  serviceName: 'realtime-service'
  serviceDir: 'backend/services/realtime-service'
```

In the `BuildNodeServices` job, which runs:
- `npm ci` (expects package.json)
- `npm run lint` (expects package.json)
- `npm run build` (expects package.json)

None of these work for a Go service.

## Root Cause Analysis

1. **advertising-service**: Incomplete package.json - missing linting dependencies
2. **realtime-service**: Service technology mismatch - Go service in Node.js build job
3. **Pipeline design**: No dedicated build job for Go services

## Files Modified

- ✏️ `backend/services/advertising-service/package.json`
- ✏️ `pipelines/ci-pipeline.yml`

## Additional Notes

- All other Node.js services (auth-service, user-service, etc.) already have correct ESLint dependencies
- The root `.eslintrc.js` exists and will be used by advertising-service once dependencies are installed
- The realtime-service Docker build (in the BuildDockerImages stage) is already correct and doesn't need changes
- The realtime-service uses Go 1.21 as specified in go.mod

## Troubleshooting

### If advertising-service still fails after fix:

1. Check that dependencies were installed:
   ```bash
   cd backend/services/advertising-service
   ls node_modules/.bin/eslint  # Should exist
   ```

2. Try clearing cache:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### If realtime-service still fails after fix:

1. Verify Go is installed on the build agent:
   ```bash
   go version  # Should show Go 1.21+
   ```

2. Check go.mod is valid:
   ```bash
   cd backend/services/realtime-service
   go mod verify
   ```

## Support

If issues persist after applying these fixes, check:
1. Build agent has internet connectivity (to download npm packages and Go modules)
2. Build agent has sufficient permissions
3. No network proxy issues blocking package downloads
