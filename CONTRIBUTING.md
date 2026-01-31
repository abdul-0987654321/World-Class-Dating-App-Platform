# Contributing to Flamoral

Thank you for contributing to Flamoral. This guide covers everything you need to get started.

## Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Docker** & Docker Compose
- **Git**

### Development Setup

```bash
# Clone the repository
git clone https://github.com/oks-citadel/World-Class-Dating-App-Platform.git
cd World-Class-Dating-App-Platform

# Install all workspace dependencies
npm install

# Copy environment files
cp .env.example .env

# Start infrastructure (PostgreSQL, Redis, LocalStack)
docker-compose -f infrastructure/local-dev/docker-compose.dev.yml up -d

# Start development servers
npm run dev:web        # Web app at http://localhost:5173
npm run dev:backend    # Backend services
```

## Branch Naming

Use the following prefixes for all branches:

| Prefix      | Purpose                          | Example                          |
| ----------- | -------------------------------- | -------------------------------- |
| `feature/*` | New features                     | `feature/video-call-filters`     |
| `fix/*`     | Bug fixes                        | `fix/login-redirect-loop`        |
| `hotfix/*`  | Urgent production fixes          | `hotfix/payment-webhook-timeout` |
| `chore/*`   | Tooling, dependencies, refactors | `chore/upgrade-typescript-5.4`   |
| `docs/*`    | Documentation only               | `docs/api-rate-limits`           |

Always branch from `main`. Keep branch names lowercase with hyphens.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

<optional body>

<optional footer>
```

### Types

| Type       | When to use                          |
| ---------- | ------------------------------------ |
| `feat`     | New feature                          |
| `fix`      | Bug fix                              |
| `docs`     | Documentation changes                |
| `style`    | Formatting, missing semicolons, etc. |
| `refactor` | Code change that neither fixes nor adds |
| `perf`     | Performance improvement              |
| `test`     | Adding or updating tests             |
| `chore`    | Build process, dependency updates    |
| `ci`       | CI/CD pipeline changes               |
| `security` | Security fixes or improvements       |

### Scope

Use the service or package name: `auth-service`, `web-app`, `matching-service`, `api-gateway`, etc.

### Examples

```
feat(matching-service): add compatibility score to discovery endpoint
fix(auth-service): prevent token refresh race condition
test(payment-service): add integration tests for webhook handling
security(api-gateway): add rate limiting to file upload endpoints
```

## Pull Request Process

1. **Create a feature branch** from `main`.
2. **Make your changes** with clear, focused commits.
3. **Write/update tests** for any code changes.
4. **Run linting and tests locally** before pushing:
   ```bash
   npm run lint:all
   npm run test:backend
   ```
5. **Open a PR** against `main` with a clear title and description.
6. **Fill out the PR template** -- describe what changed and why.
7. **Wait for CI** -- all checks must pass.
8. **Get at least one review** from a team member.
9. **Address feedback** with new commits (do not force-push during review).
10. **Squash and merge** once approved.

### PR Checklist

- [ ] Branch is up to date with `main`
- [ ] All CI checks pass (lint, typecheck, tests, security scan)
- [ ] New code has test coverage
- [ ] No secrets or credentials committed
- [ ] Breaking changes are documented
- [ ] API changes have updated documentation

## Code Style

### Tools

- **ESLint** -- enforced via `npm run lint:all`
- **Prettier** -- format with `npx prettier --write .`
- **TypeScript** -- strict mode enabled across all packages

### Rules

- Use TypeScript for all new code. No plain JavaScript files.
- Enable strict null checks. Avoid `any` types -- use `unknown` when the type is genuinely uncertain.
- Use named exports over default exports.
- Keep functions small and focused. Extract shared logic into `packages/shared/` or `backend/shared/`.
- Use async/await over raw Promises. Always handle errors -- never leave empty catch blocks.
- Use `const` by default. Use `let` only when reassignment is necessary.

### File Organization

- Co-locate tests with source: `service.ts` and `service.test.ts` in the same directory.
- Group imports: external packages first, then internal packages (`@flamoral/*`), then relative imports.

## Testing Requirements

### New Code

- All new functions and endpoints must have unit tests.
- Target 80% code coverage for new files.
- Use descriptive test names: `it('should return 401 when token is expired')`.

### API Changes

- Add or update integration tests in `backend/tests/integration/`.
- Test both success and error paths.
- Verify rate limits, authentication, and input validation.

### Running Tests

```bash
# Unit tests
npm run test:backend

# Integration tests (requires Docker)
npm run test:integration:docker

# E2E tests
npm run test:e2e

# Full CI suite
npm run test:ci
```

### Test Structure

| Layer       | Location                     | Framework   |
| ----------- | ---------------------------- | ----------- |
| Unit        | `*/src/**/*.test.ts`         | Jest/Vitest |
| Integration | `backend/tests/integration/` | Jest        |
| E2E (API)   | `tests/e2e/api/`             | Jest        |
| E2E (UI)    | `tests/e2e/`                 | Playwright  |
| Security    | `tests/security/`            | Jest        |

## Security

- **Never commit secrets.** No API keys, passwords, tokens, or credentials in code.
- Use `.env.example` files to document new environment variables. Add placeholder values, not real ones.
- Run `npm audit` before submitting PRs with dependency changes.
- Report security vulnerabilities privately -- do not open public issues.
- All user input must be validated and sanitized at the API boundary.
- Use parameterized queries for all database operations.
- Follow the guidelines in [docs/SECURITY.md](docs/SECURITY.md).

## Questions?

- Check [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup instructions.
- Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues.
- Open a GitHub Discussion for general questions.
