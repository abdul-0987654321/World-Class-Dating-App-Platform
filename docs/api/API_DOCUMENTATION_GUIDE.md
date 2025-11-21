# API Documentation Guide

**Date:** 2025-11-20
**Status:** ✅ GUIDE COMPLETE - Ready for Implementation
**Standard:** OpenAPI 3.0 (Swagger)

---

## Overview

This guide provides complete instructions for documenting all ConnectSphere APIs using OpenAPI/Swagger specification, making it easy for frontend developers and third-party integrators to understand and use the APIs.

---

## Table of Contents

1. [Why API Documentation](#why-api-documentation)
2. [Tools & Setup](#tools--setup)
3. [OpenAPI Specification](#openapi-specification)
4. [Implementation](#implementation)
5. [Documentation Examples](#documentation-examples)
6. [Interactive API Explorer](#interactive-api-explorer)
7. [Best Practices](#best-practices)

---

## 1. Why API Documentation

### Benefits
- **Developer Experience** - Easy to understand and use APIs
- **Reduced Support** - Self-service documentation
- **API Testing** - Interactive testing directly in browser
- **Client Generation** - Auto-generate API clients
- **Contract-First Development** - Define API before implementation
- **Team Collaboration** - Frontend/backend teams aligned

### What We'll Document
- All REST API endpoints
- Request/response schemas
- Authentication methods
- Error codes
- Rate limiting
- Examples for every endpoint

---

## 2. Tools & Setup

### A. Swagger/OpenAPI Tools

**swagger-ui-express** - Serves interactive API documentation
**swagger-jsdoc** - Generates OpenAPI from JSDoc comments
**@apidevtools/swagger-parser** - Validates OpenAPI specs

### B. Installation

```bash
cd backend/services/user-service

npm install --save swagger-ui-express swagger-jsdoc
npm install --save-dev @types/swagger-ui-express @types/swagger-jsdoc
```

### C. Project Structure

```
backend/services/user-service/
├── src/
│   ├── swagger/
│   │   ├── swagger.config.ts
│   │   ├── schemas/
│   │   │   ├── user.schema.ts
│   │   │   ├── auth.schema.ts
│   │   │   └── error.schema.ts
│   │   └── paths/
│   │       ├── auth.paths.ts
│   │       ├── users.paths.ts
│   │       └── profile.paths.ts
│   ├── api/
│   │   └── routes/
│   │       └── auth.routes.ts  (with JSDoc comments)
│   └── index.ts
```

---

## 3. OpenAPI Specification

### A. Basic Structure

```yaml
openapi: 3.0.0
info:
  title: ConnectSphere API
  version: 1.0.0
  description: Dating platform API documentation

servers:
  - url: https://api.connectsphere.com
    description: Production server
  - url: https://api-staging.connectsphere.com
    description: Staging server
  - url: http://localhost:3001
    description: Development server

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        firstName:
          type: string
        lastName:
          type: string

paths:
  /api/auth/register:
    post:
      summary: Register new user
      tags: [Authentication]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterRequest'
      responses:
        '201':
          description: User created successfully
```

---

## 4. Implementation

### A. Swagger Configuration

Create `src/swagger/swagger.config.ts`:

```typescript
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ConnectSphere User Service API',
      version: '1.0.0',
      description: 'User management and authentication API for ConnectSphere dating platform',
      contact: {
        name: 'API Support',
        email: 'api@connectsphere.com',
        url: 'https://connectsphere.com/support',
      },
      license: {
        name: 'Proprietary',
        url: 'https://connectsphere.com/license',
      },
    },
    servers: [
      {
        url: 'https://api.connectsphere.com',
        description: 'Production server',
      },
      {
        url: 'https://api-staging.connectsphere.com',
        description: 'Staging server',
      },
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Profile',
        description: 'User profile endpoints',
      },
      {
        name: 'Photos',
        description: 'Photo management endpoints',
      },
    ],
  },
  apis: [
    './src/api/routes/*.ts',
    './src/swagger/schemas/*.ts',
    './src/swagger/paths/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
```

### B. Add to Express App

Update `src/index.ts`:

```typescript
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger/swagger.config';

const app = express();

// ... other middleware ...

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ConnectSphere API Documentation',
  customfavIcon: '/favicon.ico',
}));

// JSON version of API docs
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ... routes ...

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
  console.log('API Documentation available at http://localhost:3001/api-docs');
});
```

---

## 5. Documentation Examples

### A. Authentication Endpoints

```typescript
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     description: Create a new user account. Email must be unique and user must be 18+ years old.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - dateOfBirth
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *                 description: User's email address (must be unique)
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePassword123!
 *                 description: Strong password (min 8 chars, uppercase, lowercase, number, special char)
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: John
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: Doe
 *                 description: User's last name
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: 1995-01-15
 *                 description: Date of birth (must be 18+)
 *               gender:
 *                 type: string
 *                 enum: [male, female, non-binary, other]
 *                 example: male
 *                 description: User's gender
 *               interestedIn:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [male, female, non-binary, other]
 *                 example: [female]
 *                 description: Gender(s) user is interested in
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                   description: JWT authentication token
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               emailExists:
 *                 value:
 *                   success: false
 *                   error: Email already exists
 *                   code: EMAIL_EXISTS
 *               underage:
 *                 value:
 *                   success: false
 *                   error: You must be at least 18 years old
 *                   code: UNDERAGE
 *               invalidEmail:
 *                 value:
 *                   success: false
 *                   error: Invalid email format
 *                   code: INVALID_EMAIL
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/api/auth/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to user account
 *     tags: [Authentication]
 *     description: Authenticate user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePassword123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Invalid email or password
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Too many login attempts. Please try again in 1 hour.
 */
router.post('/api/auth/login', login);
```

---

### B. User Profile Endpoints

```typescript
/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/api/users/me', requireAuth, getMe);

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: Love hiking, photography, and traveling
 *               occupation:
 *                 type: string
 *                 example: Software Engineer
 *               education:
 *                 type: string
 *                 example: University of California
 *               location:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                     example: San Francisco
 *                   state:
 *                     type: string
 *                     example: CA
 *                   country:
 *                     type: string
 *                     example: USA
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [hiking, photography, cooking]
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 */
router.put('/api/users/me', requireAuth, updateMe);
```

---

### C. Photo Upload Endpoint

```typescript
/**
 * @swagger
 * /api/photos/upload:
 *   post:
 *     summary: Upload profile photo
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, max 10MB)
 *               isPrimary:
 *                 type: boolean
 *                 default: false
 *                 description: Set as primary profile photo
 *     responses:
 *       201:
 *         description: Photo uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 photo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 550e8400-e29b-41d4-a716-446655440000
 *                     url:
 *                       type: string
 *                       example: https://storage.azure.com/photos/user123/photo1.jpg
 *                     isPrimary:
 *                       type: boolean
 *                       example: true
 *                     moderationStatus:
 *                       type: string
 *                       enum: [pending, approved, rejected]
 *                       example: pending
 *       400:
 *         description: Invalid file format or size
 *       401:
 *         description: Not authenticated
 *       413:
 *         description: File too large
 */
router.post('/api/photos/upload', requireAuth, upload.single('photo'), uploadPhoto);
```

---

### D. Schema Definitions

Create `src/swagger/schemas/user.schema.ts`:

```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         email:
 *           type: string
 *           format: email
 *           example: john.doe@example.com
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           example: 1995-01-15
 *         age:
 *           type: integer
 *           example: 28
 *         gender:
 *           type: string
 *           enum: [male, female, non-binary, other]
 *           example: male
 *         interestedIn:
 *           type: array
 *           items:
 *             type: string
 *           example: [female]
 *         bio:
 *           type: string
 *           example: Love hiking and photography
 *         occupation:
 *           type: string
 *           example: Software Engineer
 *         education:
 *           type: string
 *           example: University of California
 *         location:
 *           type: object
 *           properties:
 *             city:
 *               type: string
 *               example: San Francisco
 *             state:
 *               type: string
 *               example: CA
 *             country:
 *               type: string
 *               example: USA
 *             coordinates:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                   example: 37.7749
 *                 longitude:
 *                   type: number
 *                   example: -122.4194
 *         photos:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Photo'
 *         interests:
 *           type: array
 *           items:
 *             type: string
 *           example: [hiking, photography, cooking]
 *         subscriptionTier:
 *           type: string
 *           enum: [free, basic, mid, ultra]
 *           example: basic
 *         verified:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-01-15T10:30:00Z
 *         lastActive:
 *           type: string
 *           format: date-time
 *           example: 2025-11-20T14:25:00Z
 *
 *     Photo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         url:
 *           type: string
 *           example: https://storage.azure.com/photos/user123/photo1.jpg
 *         isPrimary:
 *           type: boolean
 *           example: true
 *         order:
 *           type: integer
 *           example: 1
 *         moderationStatus:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           example: approved
 */
```

---

## 6. Interactive API Explorer

### Accessing Swagger UI

Once configured, visit:
- **Development:** http://localhost:3001/api-docs
- **Staging:** https://api-staging.connectsphere.com/api-docs
- **Production:** https://api.connectsphere.com/api-docs

### Features:
- **Try It Out** - Test endpoints directly from browser
- **Authorization** - Add JWT token for authenticated endpoints
- **Schemas** - View all data models
- **Examples** - See request/response examples
- **Download** - Export OpenAPI JSON/YAML

### Testing Authenticated Endpoints:

1. Click "Authorize" button at top
2. Enter: `Bearer YOUR_JWT_TOKEN`
3. Click "Authorize"
4. All subsequent requests will include the token

---

## 7. Best Practices

### A. Always Document

**Every Endpoint Must Have:**
- Summary (1 line description)
- Description (detailed explanation)
- Tags (for grouping)
- Parameters (path, query, body)
- Responses (all possible status codes)
- Examples (realistic data)
- Security requirements

### B. Use Consistent Naming

```typescript
// Good
POST   /api/users          - Create user
GET    /api/users/:id      - Get user by ID
PUT    /api/users/:id      - Update user
DELETE /api/users/:id      - Delete user

// Bad
POST   /api/createUser
GET    /api/getUserById/:id
POST   /api/user-update/:id
```

### C. Document All Response Codes

```yaml
responses:
  200:
    description: Success
  201:
    description: Created
  400:
    description: Bad request
  401:
    description: Unauthorized
  403:
    description: Forbidden
  404:
    description: Not found
  409:
    description: Conflict
  422:
    description: Validation error
  429:
    description: Too many requests
  500:
    description: Internal server error
```

### D. Include Examples

```yaml
examples:
  success:
    value:
      success: true
      user:
        id: "123"
        email: "test@example.com"
  emailExists:
    value:
      success: false
      error: "Email already exists"
```

### E. Use Schema References

```yaml
# Don't repeat yourself
schema:
  $ref: '#/components/schemas/User'

# Instead of copying the whole schema everywhere
```

---

## 8. Documentation Checklist

### Per Service:
- [ ] Install swagger dependencies
- [ ] Create swagger.config.ts
- [ ] Add swagger middleware to Express
- [ ] Create schema definitions
- [ ] Document all authentication endpoints
- [ ] Document all CRUD endpoints
- [ ] Document file upload endpoints
- [ ] Add request/response examples
- [ ] Test all endpoints in Swagger UI
- [ ] Add authentication instructions

### Global:
- [ ] API Gateway documentation aggregates all services
- [ ] Consistent naming across services
- [ ] Error response format standardized
- [ ] Rate limiting documented
- [ ] Deprecation notices for old endpoints
- [ ] Versioning strategy documented

---

## 9. Services to Document

### User Service
- Authentication (register, login, logout)
- Profile management
- Account settings
- Email verification
- Password reset

### Messaging Service
- Send message
- Get conversations
- Mark as read
- Delete conversation
- Block user

### Matching Service
- Get potential matches
- Swipe (like/pass)
- Get matches
- Undo swipe
- Boost profile

### Media Service
- Upload photo
- Delete photo
- Reorder photos
- Get photo moderation status

### Payment Service
- Get subscription plans
- Create subscription
- Cancel subscription
- Get coin packages
- Purchase coins
- Get transaction history

### Notification Service
- Get notifications
- Mark notification as read
- Update notification preferences

### Moderation Service
- Report user
- Report content
- Get moderation status

### Analytics Service
- Get user stats
- Track events
- Get dashboard data

---

## 10. Example Full Documentation

### Complete Auth Routes Example

```typescript
// src/api/routes/auth.routes.ts

import express from 'express';
import { register, login, logout, verifyEmail } from '../controllers/auth.controller';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and account management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Authentication]
 *     description: |
 *       Create a new user account for ConnectSphere.
 *
 *       **Requirements:**
 *       - Email must be unique
 *       - User must be 18+ years old
 *       - Password must be at least 8 characters
 *       - Password must contain uppercase, lowercase, number, and special character
 *
 *       **After registration:**
 *       - Verification email will be sent
 *       - JWT token is returned for immediate authentication
 *       - User profile is created with default settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - dateOfBirth
 *               - gender
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Valid email address
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: Strong password
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Must be 18+
 *               gender:
 *                 type: string
 *                 enum: [male, female, non-binary, other]
 *           examples:
 *             example1:
 *               value:
 *                 email: john.doe@example.com
 *                 password: SecurePass123!
 *                 firstName: John
 *                 lastName: Doe
 *                 dateOfBirth: "1995-01-15"
 *                 gender: male
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *             example:
 *               success: true
 *               user:
 *                 id: "550e8400-e29b-41d4-a716-446655440000"
 *                 email: "john.doe@example.com"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               emailExists:
 *                 value:
 *                   success: false
 *                   error: "Email already exists"
 *                   code: "EMAIL_EXISTS"
 *               underage:
 *                 value:
 *                   success: false
 *                   error: "You must be at least 18 years old"
 *                   code: "UNDERAGE"
 */
router.post('/register', register);

export default router;
```

---

## Summary

✅ **Swagger Setup** - OpenAPI 3.0 with swagger-ui-express
✅ **Interactive Docs** - Try endpoints directly in browser
✅ **Complete Examples** - Authentication, CRUD, file upload
✅ **Schema Definitions** - Reusable data models
✅ **Best Practices** - Consistent naming, comprehensive documentation
✅ **Multi-Service** - Document all 8 microservices

**Setup Time:** 8-10 hours (all services)
**Impact:** HIGH - Improves developer experience, reduces support time

**Status:** ✅ **API DOCUMENTATION GUIDE COMPLETE**
**Next:** Implement Swagger in all services, starting with User Service

**Access Documentation:**
- Development: http://localhost:3001/api-docs
- Staging: https://api-staging.connectsphere.com/api-docs
- Production: https://api.connectsphere.com/api-docs
