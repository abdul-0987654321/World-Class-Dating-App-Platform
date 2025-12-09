# Media API Tests - Integration Guide

## Adding to package.json Scripts

Add these scripts to your root `package.json` or `tests/package.json`:

```json
{
  "scripts": {
    "test:media": "jest tests/e2e/api/media-api.spec.ts --verbose",
    "test:media:photo": "jest tests/e2e/api/media-api.spec.ts -t 'Photo Upload' --verbose",
    "test:media:video": "jest tests/e2e/api/media-api.spec.ts -t 'Video Upload' --verbose",
    "test:media:voice": "jest tests/e2e/api/media-api.spec.ts -t 'Voice Note Upload' --verbose",
    "test:media:coverage": "jest tests/e2e/api/media-api.spec.ts --coverage",
    "test:media:watch": "jest tests/e2e/api/media-api.spec.ts --watch"
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/media-api-tests.yml`:

```yaml
name: Media API E2E Tests

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'backend/services/media-service/**'
      - 'tests/e2e/api/media-api.spec.ts'
  pull_request:
    branches: [ main, develop ]
    paths:
      - 'backend/services/media-service/**'
      - 'tests/e2e/api/media-api.spec.ts'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: flamoral_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      azurite:
        image: mcr.microsoft.com/azure-storage/azurite
        ports:
          - 10000:10000
          - 10001:10001
          - 10002:10002

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          cd tests && npm ci

      - name: Setup environment
        run: |
          cp .env.example .env.test
          echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flamoral_test" >> .env.test
          echo "REDIS_URL=redis://localhost:6379" >> .env.test
          echo "AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true;DevelopmentStorageProxyUri=http://localhost:10000" >> .env.test

      - name: Run database migrations
        run: |
          cd backend/services/media-service
          npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/flamoral_test

      - name: Start Auth Service
        run: |
          cd backend/services/auth-service
          npm run build
          npm start &
          sleep 5
        env:
          NODE_ENV: test
          PORT: 3001

      - name: Start Media Service
        run: |
          cd backend/services/media-service
          npm run build
          npm start &
          sleep 10
        env:
          NODE_ENV: test
          PORT: 3005

      - name: Wait for services to be ready
        run: |
          npx wait-on http://localhost:3001/health http://localhost:3005/health -t 30000

      - name: Run Media API tests
        run: npm run test:media
        env:
          MEDIA_API_URL: http://localhost:3005
          AUTH_URL: http://localhost:3001

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            coverage/
            test-results/

      - name: Comment test results on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            // Add logic to post test summary to PR
```

### GitLab CI Configuration

Create `.gitlab-ci.yml` or add to existing:

```yaml
media-api-tests:
  stage: test
  image: node:20-alpine

  services:
    - name: postgres:15
      alias: postgres
    - name: redis:7-alpine
      alias: redis
    - name: mcr.microsoft.com/azure-storage/azurite
      alias: azurite

  variables:
    POSTGRES_DB: flamoral_test
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/flamoral_test
    REDIS_URL: redis://redis:6379
    MEDIA_API_URL: http://localhost:3005
    AUTH_URL: http://localhost:3001

  before_script:
    - npm ci
    - cd tests && npm ci && cd ..

  script:
    # Start services
    - cd backend/services/auth-service && npm start &
    - cd backend/services/media-service && npm start &
    - sleep 15

    # Run tests
    - npm run test:media

  artifacts:
    when: always
    reports:
      junit: test-results/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
      - test-results/

  only:
    changes:
      - backend/services/media-service/**/*
      - tests/e2e/api/media-api.spec.ts
```

### Docker Compose for Testing

Create `docker-compose.test.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: flamoral_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  azurite:
    image: mcr.microsoft.com/azure-storage/azurite
    ports:
      - "10000:10000"
      - "10001:10001"
      - "10002:10002"
    command: azurite --blobHost 0.0.0.0 --queueHost 0.0.0.0 --tableHost 0.0.0.0

  auth-service:
    build:
      context: ./backend/services/auth-service
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: test
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/flamoral_test
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  media-service:
    build:
      context: ./backend/services/media-service
    ports:
      - "3005:3005"
    environment:
      NODE_ENV: test
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/flamoral_test
      REDIS_URL: redis://redis:6379
      AZURE_STORAGE_CONNECTION_STRING: DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://azurite:10000/devstoreaccount1;
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      azurite:
        condition: service_started

  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    command: npm run test:media
    environment:
      MEDIA_API_URL: http://media-service:3005
      AUTH_URL: http://auth-service:3001
    depends_on:
      - auth-service
      - media-service
    volumes:
      - ./coverage:/app/coverage
      - ./test-results:/app/test-results
```

Run with:
```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## Pre-commit Hook

Add to `.husky/pre-commit` or create if it doesn't exist:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check if media service files changed
if git diff --cached --name-only | grep -q "backend/services/media-service"; then
  echo "Media service files changed, running tests..."
  npm run test:media

  if [ $? -ne 0 ]; then
    echo "Media API tests failed. Commit aborted."
    exit 1
  fi
fi
```

## VS Code Integration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Media API Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "tests/e2e/api/media-api.spec.ts",
        "--runInBand",
        "--verbose"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": {
        "MEDIA_API_URL": "http://localhost:3005",
        "AUTH_URL": "http://localhost:3001"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Media API Tests (Debug Single)",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "tests/e2e/api/media-api.spec.ts",
        "--runInBand",
        "--testNamePattern=${input:testName}"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": {
        "MEDIA_API_URL": "http://localhost:3005",
        "AUTH_URL": "http://localhost:3001"
      }
    }
  ],
  "inputs": [
    {
      "id": "testName",
      "type": "promptString",
      "description": "Test name pattern",
      "default": "should upload a valid JPEG"
    }
  ]
}
```

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run Media API Tests",
      "type": "shell",
      "command": "npm",
      "args": ["run", "test:media"],
      "group": {
        "kind": "test",
        "isDefault": true
      },
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "Run Media API Tests (Watch)",
      "type": "shell",
      "command": "npm",
      "args": ["run", "test:media:watch"],
      "group": "test",
      "isBackground": true,
      "presentation": {
        "reveal": "always",
        "panel": "dedicated"
      }
    }
  ]
}
```

## Test Reporting

### Jest Configuration for Reporters

Add to `jest.config.js` or create specific config:

```javascript
module.exports = {
  // ... other config
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit-media-api.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './test-results/html',
        filename: 'media-api-report.html',
        expand: true,
        pageTitle: 'Media API Test Results'
      }
    ]
  ],
  coverageReporters: ['text', 'lcov', 'html', 'cobertura'],
  collectCoverageFrom: [
    'backend/services/media-service/src/**/*.ts',
    '!backend/services/media-service/src/**/*.test.ts',
    '!backend/services/media-service/src/**/*.spec.ts'
  ]
};
```

Install reporter dependencies:
```bash
npm install --save-dev jest-junit jest-html-reporters
```

## Monitoring & Alerts

### Set up test monitoring with alerts

```javascript
// tests/e2e/api/test-monitor.js
const axios = require('axios');

async function sendTestResults(results) {
  // Send to Slack
  if (process.env.SLACK_WEBHOOK_URL) {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `Media API Tests: ${results.success ? '✅ PASSED' : '❌ FAILED'}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Media API Test Results*\nTotal: ${results.total}\nPassed: ${results.passed}\nFailed: ${results.failed}`
          }
        }
      ]
    });
  }

  // Send to DataDog or other monitoring
  if (process.env.DATADOG_API_KEY) {
    // Implementation for DataDog
  }
}

module.exports = { sendTestResults };
```

## Running Tests in Different Environments

### Local Development
```bash
npm run test:media
```

### Staging Environment
```bash
MEDIA_API_URL=https://staging-media.flamoral.com \
AUTH_URL=https://staging-auth.flamoral.com \
npm run test:media
```

### Production Smoke Tests
```bash
# Limited safe tests only
MEDIA_API_URL=https://media.flamoral.com \
AUTH_URL=https://auth.flamoral.com \
npm run test:media -- --testPathPattern=smoke
```

## Performance Testing

Add performance benchmarks:

```typescript
// In test file
describe('Performance Tests', () => {
  it('should handle 10 concurrent photo uploads in < 30s', async () => {
    const startTime = Date.now();

    const uploads = Array(10).fill(null).map(() =>
      request(MEDIA_API_URL)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('photo', createTestImage(500), 'perf-test.jpg')
    );

    await Promise.all(uploads);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(30000);
  }, 60000);
});
```

---

**Ready to integrate!** Choose the configurations that match your infrastructure and workflow.
