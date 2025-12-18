# Testing Documentation

Testing strategies and resources for Flamoral.

## Contents

- [test-inventory.md](./test-inventory.md) - Test resources inventory

## Testing Strategy

- **Unit Tests**: Jest for all services
- **Integration Tests**: Supertest for API endpoints
- **E2E Tests**: Cypress for web, Detox for mobile

## Running Tests

```bash
# All tests
yarn test

# Specific service
yarn workspace @flamoral/user-service test

# Coverage report
yarn test:coverage
```

## CI/CD

Tests run automatically via GitHub Actions on:
- Pull requests
- Pushes to main branch
