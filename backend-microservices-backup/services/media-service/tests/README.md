# Media Service Tests

This directory contains comprehensive tests for the Media Service.

## Test Structure

```
tests/
├── unit/               # Unit tests (isolated component tests)
│   ├── services/       # Service layer tests
│   └── ...
├── integration/        # Integration tests (database, external services)
│   └── repositories/   # Repository layer tests
├── e2e/               # End-to-end tests (full API tests)
│   └── api/           # API endpoint tests
├── mocks/             # Mock implementations
├── helpers/           # Test utilities and helpers
└── setup.ts           # Global test setup
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run specific test suite
```bash
# Unit tests only
npm run test:unit

# Integration tests
npm test -- --testPathPattern=integration

# E2E tests
npm test -- --testPathPattern=e2e
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run specific test file
```bash
npm test -- upload.service.test.ts
```

## Test Categories

### Unit Tests
- **Services**: Test business logic in isolation
  - `upload.service.test.ts` - Photo upload and management
  - `photo-verification.service.test.ts` - Photo verification logic
  - `image-processing.service.test.ts` - Image processing and validation

### Integration Tests
- **Repositories**: Test database operations
  - `media.repository.test.ts` - Media CRUD operations

### E2E Tests
- **API Routes**: Test complete API workflows
  - `media.routes.test.ts` - Media API endpoints

## Mocks

Mocks are used to isolate tests from external dependencies:

- `azure-storage.mock.ts` - Azure Blob Storage operations
- `content-moderation.mock.ts` - Azure Computer Vision API
- `image-processing.mock.ts` - Sharp image processing

## Test Data Helpers

The `helpers/test-data.ts` file provides utilities for creating test data:

```typescript
import { createMockFile, createMockMedia } from '../helpers/test-data';

const mockFile = createMockFile();
const mockMedia = createMockMedia({ isProfilePhoto: true });
```

## Writing New Tests

### Unit Test Example

```typescript
import { ServiceName } from '../../../src/domain/services/service-name.service';

describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    service = new ServiceName();
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      const input = 'test';

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

### Integration Test Example

```typescript
describe('Repository Integration Tests', () => {
  beforeAll(async () => {
    // Setup database connection
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should perform database operation', async () => {
    // Test implementation
  });
});
```

## Coverage Goals

We aim for the following coverage targets:
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

## Continuous Integration

Tests are automatically run on:
- Every commit
- Pull requests
- Before deployment

## Troubleshooting

### Tests failing locally

1. Ensure all dependencies are installed:
   ```bash
   npm install
   ```

2. Clear Jest cache:
   ```bash
   npm test -- --clearCache
   ```

3. Check environment variables in `tests/setup.ts`

### Timeout errors

Increase timeout in jest.config.js:
```javascript
testTimeout: 20000 // 20 seconds
```

Or for specific tests:
```typescript
jest.setTimeout(20000);
```
