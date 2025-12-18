# Contributing Guidelines - Flamoral Platform

Guidelines for contributing to the Flamoral codebase.

**Last Updated:** 2025-12-18

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Coding Standards](#coding-standards)
4. [Testing Requirements](#testing-requirements)
5. [Pull Request Process](#pull-request-process)
6. [Code Review Guidelines](#code-review-guidelines)
7. [Security Practices](#security-practices)

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. Read the [Development Setup Guide](./setup.md)
2. Set up your local development environment
3. Familiarized yourself with the [Architecture Overview](../architecture/overview.md)
4. Joined the team communication channels (Slack, Discord, etc.)

### First Contribution

Good first issues are tagged with `good-first-issue` label:
- Bug fixes
- Documentation improvements
- Test coverage improvements
- Small feature enhancements

---

## Development Workflow

### 1. Create a Branch

```bash
# Sync with main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description

# Or for documentation
git checkout -b docs/documentation-update
```

### Branch Naming Convention

```
feature/    - New features
fix/        - Bug fixes
refactor/   - Code refactoring
docs/       - Documentation updates
test/       - Test additions or updates
chore/      - Maintenance tasks
perf/       - Performance improvements
```

### 2. Make Changes

- Write clean, maintainable code
- Follow coding standards (see below)
- Add tests for new functionality
- Update documentation as needed

### 3. Commit Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
# Format: type(scope): subject

git commit -m "feat(auth): add biometric authentication support"
git commit -m "fix(matching): resolve swipe animation bug"
git commit -m "docs(api): update authentication endpoints"
git commit -m "test(messaging): add E2E tests for chat"
git commit -m "refactor(user): simplify profile update logic"
```

#### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (deps, build, etc.)
- `ci`: CI/CD changes
- `revert`: Revert previous commit

#### Commit Message Examples

```bash
feat(auth): implement OAuth 2.0 social login
fix(matching): correct swipe direction detection
docs(readme): add installation instructions
style(user): format profile component with Prettier
refactor(messaging): extract encryption logic to service
perf(api): optimize database queries with indexes
test(payment): add unit tests for Stripe integration
chore(deps): update TypeScript to 5.3.3
```

### 4. Push Changes

```bash
git push origin feature/your-feature-name
```

### 5. Create Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select your branch
4. Fill out PR template (see below)
5. Link related issues
6. Request reviewers

---

## Coding Standards

### TypeScript Guidelines

#### General Rules

```typescript
// ✅ DO: Use TypeScript strict mode
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}

// ✅ DO: Define explicit types
function getUserById(id: string): Promise<User | null> {
  return userRepository.findById(id);
}

// ❌ DON'T: Use 'any' type
function processData(data: any) { // Bad
  // ...
}

// ✅ DO: Use proper type definitions
interface User {
  id: string;
  email: string;
  profile: UserProfile;
}

function processUser(user: User) { // Good
  // ...
}
```

#### Naming Conventions

```typescript
// Classes: PascalCase
class UserService {}
class AuthenticationController {}

// Interfaces: PascalCase with 'I' prefix (optional)
interface IUserRepository {}
interface UserProfile {}

// Types: PascalCase
type UserId = string;
type UserRole = 'user' | 'admin' | 'moderator';

// Functions/Methods: camelCase
function getUserProfile() {}
async function createUser() {}

// Variables: camelCase
const userId = '123';
let userCount = 0;

// Constants: UPPER_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 5;
const JWT_EXPIRES_IN = '15m';

// Private class members: prefix with underscore
class UserService {
  private _cache: Map<string, User>;
  private _logger: Logger;
}
```

#### Code Organization

```typescript
// ✅ DO: Organize imports
// 1. External dependencies
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

// 2. Internal modules
import { UserEntity } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';

// 3. Types/Interfaces
import type { UserProfile } from '../types';

// ✅ DO: Export interfaces and implementations separately
// user.service.interface.ts
export interface IUserService {
  findById(id: string): Promise<User | null>;
  create(data: CreateUserDto): Promise<User>;
}

// user.service.ts
@Injectable()
export class UserService implements IUserService {
  // Implementation
}
```

#### Error Handling

```typescript
// ✅ DO: Use custom error classes
class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

// ✅ DO: Handle errors appropriately
async function getUser(id: string): Promise<User> {
  try {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  } catch (error) {
    logger.error('Failed to get user', { userId: id, error });
    throw error;
  }
}

// ❌ DON'T: Swallow errors
async function getUser(id: string): Promise<User | null> {
  try {
    return await userRepository.findById(id);
  } catch (error) {
    return null; // Bad: error is lost
  }
}
```

### API Design

#### RESTful Conventions

```typescript
// ✅ DO: Use proper HTTP methods and status codes
@Controller('users')
export class UserController {
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getUser(@Param('id') id: string) {
    // GET /users/:id -> 200 OK
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() dto: CreateUserDto) {
    // POST /users -> 201 Created
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    // PUT /users/:id -> 200 OK
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string) {
    // DELETE /users/:id -> 204 No Content
  }
}
```

#### Request Validation

```typescript
// ✅ DO: Validate all inputs
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;
}
```

### Database Queries

```typescript
// ✅ DO: Use parameterized queries
const user = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// ❌ DON'T: Use string concatenation (SQL injection risk!)
const user = await db.query(
  `SELECT * FROM users WHERE id = '${userId}'` // DANGEROUS!
);

// ✅ DO: Use ORM/query builder
const user = await userRepository.findOne({
  where: { id: userId }
});
```

### Security Best Practices

```typescript
// ✅ DO: Sanitize user inputs
import { sanitize } from 'class-sanitizer';

function processUserBio(bio: string): string {
  return sanitize(bio); // Remove HTML, scripts, etc.
}

// ✅ DO: Hash passwords
import * as bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// ✅ DO: Validate JWT tokens
async function validateToken(token: string): Promise<User> {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return await userService.findById(payload.sub);
  } catch (error) {
    throw new UnauthorizedException('Invalid token');
  }
}

// ❌ DON'T: Log sensitive information
logger.info('User logged in', {
  userId: user.id,
  // password: user.password, // NEVER log passwords!
  // token: jwt, // NEVER log tokens!
});
```

---

## Testing Requirements

### Test Coverage

- **Minimum coverage**: 80%
- **Critical paths**: 100% (auth, payments, encryption)
- All new features must include tests

### Unit Tests

```typescript
// user.service.spec.ts
describe('UserService', () => {
  let service: UserService;
  let repository: MockType<Repository<User>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const user = { id: '1', email: 'test@test.com' };
      repository.findOne.mockResolvedValue(user);

      const result = await service.findById('1');

      expect(result).toEqual(user);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should return null when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findById('999');

      expect(result).toBeNull();
    });
  });
});
```

### Integration Tests

```typescript
// auth.e2e.spec.ts
describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'test@test.com',
        password: 'Password123!',
        firstName: 'Test',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toBe('test@test.com');
      });
  });
});
```

### Run Tests Before Committing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- user.service.spec.ts

# Run with coverage
npm run test:coverage

# Run in watch mode during development
npm run test:watch
```

---

## Pull Request Process

### 1. PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Changes Made
- Added biometric authentication
- Updated user service tests
- Added API documentation

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
- [ ] All tests passing
```

### 2. PR Size Guidelines

- **Small**: < 200 lines changed (preferred)
- **Medium**: 200-500 lines
- **Large**: > 500 lines (break into smaller PRs if possible)

### 3. CI Checks

All PRs must pass:
- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Unit tests
- ✅ Integration tests
- ✅ Security scanning (Snyk)
- ✅ Code coverage (minimum 80%)

---

## Code Review Guidelines

### For Authors

- Respond to feedback promptly
- Be open to suggestions
- Explain complex decisions
- Update PR based on feedback
- Request re-review after changes

### For Reviewers

#### What to Review

- **Functionality**: Does it work as intended?
- **Code quality**: Is it readable and maintainable?
- **Performance**: Are there any bottlenecks?
- **Security**: Are there any vulnerabilities?
- **Tests**: Is there adequate test coverage?
- **Documentation**: Is it properly documented?

#### Review Comments

```markdown
# ✅ Good feedback
"Consider extracting this logic into a separate function for better testability."
"This could cause a race condition. Consider using a transaction here."

# ❌ Poor feedback
"This is wrong."
"Rewrite this."
```

#### Approval Criteria

- [ ] Code follows style guidelines
- [ ] Logic is correct and efficient
- [ ] Tests are comprehensive
- [ ] Documentation is clear
- [ ] No security vulnerabilities
- [ ] No breaking changes (or properly documented)

---

## Security Practices

### Never Commit

- ❌ API keys, secrets, tokens
- ❌ Passwords, private keys
- ❌ Database credentials
- ❌ .env files with sensitive data

### Always

- ✅ Use environment variables
- ✅ Validate and sanitize inputs
- ✅ Use parameterized queries
- ✅ Implement rate limiting
- ✅ Log security events
- ✅ Keep dependencies updated

### Security Checklist

- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Authentication required
- [ ] Authorization checked
- [ ] Rate limiting applied
- [ ] Sensitive data encrypted
- [ ] Audit logging enabled

---

## Questions?

- Ask in team Slack: #flamoral-dev
- Review existing code for examples
- Check [Architecture Overview](../architecture/overview.md)
- See [Development Setup](./setup.md)

---

**Thank you for contributing to Flamoral!**
