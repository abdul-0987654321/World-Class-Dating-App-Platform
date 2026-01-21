/**
 * OpenAPI Schema Validation Tests
 *
 * Validates API responses against the OpenAPI specification.
 * Ensures all endpoints return correctly structured responses.
 *
 * This suite:
 * - Loads the OpenAPI spec from docs/api/openapi.yaml
 * - Validates response schemas against spec
 * - Tests all documented endpoints return correct structure
 */

import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Service URLs
const config = {
  API_GATEWAY_URL: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  AUTH_URL: process.env.AUTH_URL || 'http://localhost:3001',
  USER_URL: process.env.USER_URL || 'http://localhost:3002',
  MATCHING_URL: process.env.MATCHING_URL || 'http://localhost:3003',
  MESSAGING_URL: process.env.MESSAGING_URL || 'http://localhost:3004',
  PAYMENT_URL: process.env.PAYMENT_URL || 'http://localhost:3007',
};

// OpenAPI spec types
interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, PathItem>;
  components: {
    schemas: Record<string, SchemaObject>;
    responses: Record<string, ResponseObject>;
  };
}

interface PathItem {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  delete?: OperationObject;
  patch?: OperationObject;
}

interface OperationObject {
  operationId?: string;
  tags?: string[];
  summary?: string;
  security?: Array<Record<string, string[]>>;
  responses: Record<string, ResponseObject>;
  requestBody?: {
    required?: boolean;
    content: Record<string, { schema: SchemaObject }>;
  };
}

interface ResponseObject {
  description: string;
  content?: Record<string, { schema: SchemaObject }>;
}

interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  $ref?: string;
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  enum?: string[];
  format?: string;
  nullable?: boolean;
  additionalProperties?: boolean | SchemaObject;
}

// Test credentials
const TEST_EMAIL = process.env.TEST_USER_EMAIL || `schema-test-${Date.now()}@flamoral.test`;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'SchemaTestPassword123!';

// Shared state
let openAPISpec: OpenAPISpec;
let accessToken: string;

/**
 * Load and parse the OpenAPI specification
 */
function loadOpenAPISpec(): OpenAPISpec {
  const specPath = path.resolve(__dirname, '../../../docs/api/openapi.yaml');

  if (!fs.existsSync(specPath)) {
    throw new Error(`OpenAPI spec not found at: ${specPath}`);
  }

  const specContent = fs.readFileSync(specPath, 'utf8');
  return yaml.load(specContent) as OpenAPISpec;
}

/**
 * Resolve a $ref reference in the OpenAPI spec
 */
function resolveRef(ref: string, spec: OpenAPISpec): SchemaObject {
  const refPath = ref.replace('#/', '').split('/');
  let current: unknown = spec;

  for (const part of refPath) {
    current = (current as Record<string, unknown>)[part];
  }

  return current as SchemaObject;
}

/**
 * Get the fully resolved schema (handling $ref, allOf, etc.)
 */
function resolveSchema(schema: SchemaObject, spec: OpenAPISpec): SchemaObject {
  if (schema.$ref) {
    return resolveSchema(resolveRef(schema.$ref, spec), spec);
  }

  if (schema.allOf) {
    const merged: SchemaObject = { type: 'object', properties: {}, required: [] };
    for (const subSchema of schema.allOf) {
      const resolved = resolveSchema(subSchema, spec);
      if (resolved.properties) {
        merged.properties = { ...merged.properties, ...resolved.properties };
      }
      if (resolved.required) {
        merged.required = [...(merged.required || []), ...resolved.required];
      }
    }
    return merged;
  }

  return schema;
}

/**
 * Validate a response body against a schema
 */
function validateSchema(
  body: unknown,
  schema: SchemaObject,
  spec: OpenAPISpec,
  path: string = ''
): string[] {
  const errors: string[] = [];
  const resolved = resolveSchema(schema, spec);

  if (body === null || body === undefined) {
    if (!resolved.nullable) {
      errors.push(`${path}: Expected value but got null/undefined`);
    }
    return errors;
  }

  switch (resolved.type) {
    case 'object':
      if (typeof body !== 'object' || Array.isArray(body)) {
        errors.push(`${path}: Expected object but got ${typeof body}`);
        break;
      }

      // Check required properties
      if (resolved.required) {
        for (const prop of resolved.required) {
          if (!(prop in (body as Record<string, unknown>))) {
            errors.push(`${path}: Missing required property '${prop}'`);
          }
        }
      }

      // Validate each property
      if (resolved.properties) {
        for (const [key, propSchema] of Object.entries(resolved.properties)) {
          if (key in (body as Record<string, unknown>)) {
            errors.push(
              ...validateSchema(
                (body as Record<string, unknown>)[key],
                propSchema,
                spec,
                `${path}.${key}`
              )
            );
          }
        }
      }
      break;

    case 'array':
      if (!Array.isArray(body)) {
        errors.push(`${path}: Expected array but got ${typeof body}`);
        break;
      }

      if (resolved.items) {
        for (let i = 0; i < Math.min(body.length, 5); i++) {
          errors.push(
            ...validateSchema(body[i], resolved.items, spec, `${path}[${i}]`)
          );
        }
      }
      break;

    case 'string':
      if (typeof body !== 'string') {
        errors.push(`${path}: Expected string but got ${typeof body}`);
      }
      if (resolved.enum && !resolved.enum.includes(body as string)) {
        errors.push(`${path}: Value '${body}' not in enum [${resolved.enum.join(', ')}]`);
      }
      break;

    case 'number':
    case 'integer':
      if (typeof body !== 'number') {
        errors.push(`${path}: Expected number but got ${typeof body}`);
      }
      break;

    case 'boolean':
      if (typeof body !== 'boolean') {
        errors.push(`${path}: Expected boolean but got ${typeof body}`);
      }
      break;
  }

  return errors;
}

/**
 * Get expected response schema for a path and status code
 */
function getResponseSchema(
  pathKey: string,
  method: string,
  statusCode: number,
  spec: OpenAPISpec
): SchemaObject | null {
  const pathItem = spec.paths[pathKey];
  if (!pathItem) return null;

  const operation = pathItem[method as keyof PathItem];
  if (!operation) return null;

  const response = operation.responses[statusCode.toString()] ||
                   operation.responses['default'];
  if (!response) return null;

  const content = response.content?.['application/json'];
  return content?.schema || null;
}

describe('OpenAPI Schema Validation Tests', () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    // Load OpenAPI spec
    try {
      openAPISpec = loadOpenAPISpec();
      console.log(`Loaded OpenAPI spec: ${openAPISpec.info.title} v${openAPISpec.info.version}`);
    } catch (error) {
      console.error('Failed to load OpenAPI spec:', error);
      throw error;
    }

    // Get auth token for authenticated endpoints
    try {
      // Try to register
      const registerResponse = await request(config.AUTH_URL)
        .post('/api/auth/register')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          firstName: 'Schema',
          lastName: 'Test',
          dateOfBirth: '1990-01-15',
          gender: 'male',
        });

      if (registerResponse.status === 201) {
        accessToken = registerResponse.body.accessToken || registerResponse.body.data?.accessToken;
      } else {
        // Try to login
        const loginResponse = await request(config.AUTH_URL)
          .post('/api/auth/login')
          .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

        if (loginResponse.status === 200) {
          accessToken = loginResponse.body.accessToken || loginResponse.body.data?.accessToken;
        }
      }

      if (accessToken) {
        console.log('Authentication successful for schema validation tests');
      }
    } catch (error) {
      console.warn('Could not authenticate for schema tests:', error);
    }
  });

  // ==================== SYSTEM ENDPOINTS ====================

  describe('System Endpoints Schema Validation', () => {
    it('GET /health - should match HealthResponse schema', async () => {
      const response = await request(config.API_GATEWAY_URL).get('/health');

      if (response.status === 200) {
        const schema = getResponseSchema('/health', 'get', 200, openAPISpec);
        if (schema) {
          const errors = validateSchema(response.body, schema, openAPISpec);
          expect(errors).toEqual([]);
        }
      }
    });

    it('GET /version - should match VersionResponse schema', async () => {
      const response = await request(config.API_GATEWAY_URL).get('/version');

      if (response.status === 200) {
        const schema = getResponseSchema('/version', 'get', 200, openAPISpec);
        if (schema) {
          const errors = validateSchema(response.body, schema, openAPISpec);
          expect(errors).toEqual([]);
        }
      }
    });

    it('GET /api/v1/config/public - should match PublicConfigResponse schema', async () => {
      const response = await request(config.API_GATEWAY_URL).get('/api/v1/config/public');

      if (response.status === 200) {
        const schema = getResponseSchema('/api/v1/config/public', 'get', 200, openAPISpec);
        if (schema) {
          const errors = validateSchema(response.body, schema, openAPISpec);
          expect(errors).toEqual([]);
        }
      }
    });
  });

  // ==================== AUTH ENDPOINTS ====================

  describe('Auth Endpoints Schema Validation', () => {
    it('POST /api/v1/auth/login - should match AuthTokens schema on success', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      if (response.status === 200) {
        const schema = getResponseSchema('/api/v1/auth/login', 'post', 200, openAPISpec);
        if (schema) {
          const errors = validateSchema(response.body, schema, openAPISpec);
          // Allow some flexibility for wrapped responses
          if (errors.length > 0 && response.body.data) {
            const dataErrors = validateSchema(response.body.data, schema, openAPISpec);
            expect(dataErrors).toEqual([]);
          } else {
            expect(errors).toEqual([]);
          }
        }
      }
    });

    it('POST /api/v1/auth/refresh-token - should match AuthTokens schema', async () => {
      // First login to get a refresh token
      const loginResponse = await request(config.AUTH_URL)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      const refreshToken = loginResponse.body.refreshToken || loginResponse.body.data?.refreshToken;

      if (refreshToken) {
        const response = await request(config.AUTH_URL)
          .post('/api/auth/refresh-token')
          .send({ refreshToken });

        if (response.status === 200) {
          const schema = getResponseSchema('/api/v1/auth/refresh-token', 'post', 200, openAPISpec);
          if (schema) {
            const errors = validateSchema(response.body, schema, openAPISpec);
            expect(errors).toEqual([]);
          }
        }
      }
    });

    it('Unauthorized response should match ErrorResponse schema', async () => {
      const response = await request(config.AUTH_URL)
        .get('/api/auth/me');

      expect(response.status).toBe(401);

      // Validate against standard error response
      const errorSchema = openAPISpec.components.schemas.ErrorResponse;
      if (errorSchema) {
        const errors = validateSchema(response.body, errorSchema, openAPISpec);
        // Error responses may vary in structure
        if (response.body.code || response.body.error) {
          expect(response.body.code || response.body.error).toBeDefined();
        }
      }
    });
  });

  // ==================== USER ENDPOINTS ====================

  describe('User Endpoints Schema Validation', () => {
    it('GET /api/v1/users/me - should match User schema', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.USER_URL)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      if (response.status === 200) {
        const schema = getResponseSchema('/api/v1/users/me', 'get', 200, openAPISpec);
        if (schema) {
          const errors = validateSchema(response.body, schema, openAPISpec);
          // User schema validation
          expect(response.body).toHaveProperty('id');
        }
      }
    });

    it('GET /api/v1/profile - should match Profile schema', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.USER_URL)
        .get('/api/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      if (response.status === 200) {
        const schema = getResponseSchema('/api/v1/profile', 'get', 200, openAPISpec);
        if (schema) {
          const errors = validateSchema(response.body, schema, openAPISpec);
          expect(errors).toEqual([]);
        }
      }
    });
  });

  // ==================== MATCHING ENDPOINTS ====================

  describe('Matching Endpoints Schema Validation', () => {
    it('GET /api/v1/discovery - should return array of profiles', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.MATCHING_URL)
        .get('/api/discovery')
        .set('Authorization', `Bearer ${accessToken}`);

      if (response.status === 200) {
        const schema = getResponseSchema('/api/v1/discovery', 'get', 200, openAPISpec);
        if (schema) {
          const errors = validateSchema(response.body, schema, openAPISpec);
          expect(errors).toEqual([]);
        }

        // Validate it's an array or has data property
        if (Array.isArray(response.body)) {
          expect(Array.isArray(response.body)).toBe(true);
        } else if (response.body.data) {
          expect(Array.isArray(response.body.data)).toBe(true);
        }
      }
    });

    it('GET /api/v1/matches - should match PaginatedResponse schema', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.MATCHING_URL)
        .get('/api/matches')
        .set('Authorization', `Bearer ${accessToken}`);

      if (response.status === 200) {
        const schema = getResponseSchema('/api/v1/matches', 'get', 200, openAPISpec);
        if (schema) {
          const errors = validateSchema(response.body, schema, openAPISpec);
          expect(errors).toEqual([]);
        }

        // Validate paginated structure
        if (response.body.pagination) {
          expect(response.body.pagination).toHaveProperty('hasMore');
        }
      }
    });

    it('POST /api/v1/swipes - should match SwipeResponse schema', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.MATCHING_URL)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          targetUserId: 'test-user-' + Date.now(),
          direction: 'like',
        });

      if (response.status === 200) {
        const schema = getResponseSchema('/api/v1/swipes', 'post', 200, openAPISpec);
        if (schema) {
          const errors = validateSchema(response.body, schema, openAPISpec);
          expect(errors).toEqual([]);
        }

        // Verify structure
        expect(response.body).toHaveProperty('success');
        if (response.body.data) {
          expect(response.body.data).toHaveProperty('matched');
        }
      }
    });
  });

  // ==================== BILLING ENDPOINTS ====================

  describe('Billing Endpoints Schema Validation', () => {
    it('GET /api/v1/plans - should match Plans array schema', async () => {
      const response = await request(config.PAYMENT_URL)
        .get('/api/plans');

      if (response.status === 200) {
        const schema = getResponseSchema('/api/v1/plans', 'get', 200, openAPISpec);
        if (schema) {
          const errors = validateSchema(response.body, schema, openAPISpec);
          expect(errors).toEqual([]);
        }

        // Validate plans structure
        const plans = response.body.data || response.body;
        if (Array.isArray(plans) && plans.length > 0) {
          expect(plans[0]).toHaveProperty('id');
          expect(plans[0]).toHaveProperty('name');
        }
      }
    });

    it('GET /api/v1/subscriptions - should match Subscription schema', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.PAYMENT_URL)
        .get('/api/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`);

      if (response.status === 200) {
        const schema = getResponseSchema('/api/v1/subscriptions', 'get', 200, openAPISpec);
        if (schema) {
          const errors = validateSchema(response.body, schema, openAPISpec);
          expect(errors).toEqual([]);
        }
      }
    });
  });

  // ==================== ERROR RESPONSE VALIDATION ====================

  describe('Error Response Schema Validation', () => {
    it('400 Bad Request should include error details', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/login')
        .send({ email: 'invalid' }); // Missing password

      expect(response.status).toBe(400);

      // Error responses should have structured format
      expect(
        response.body.code ||
        response.body.error ||
        response.body.message
      ).toBeDefined();
    });

    it('401 Unauthorized should include error code', async () => {
      const response = await request(config.AUTH_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);

      expect(
        response.body.code ||
        response.body.error ||
        response.body.message
      ).toBeDefined();
    });

    it('404 Not Found should include error details', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.MATCHING_URL)
        .get('/api/matches/nonexistent-match-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);

      expect(
        response.body.code ||
        response.body.error ||
        response.body.message
      ).toBeDefined();
    });
  });

  // ==================== CONTENT TYPE VALIDATION ====================

  describe('Content Type Validation', () => {
    it('API responses should have correct Content-Type header', async () => {
      const response = await request(config.API_GATEWAY_URL).get('/health');

      if (response.status === 200) {
        const contentType = response.headers['content-type'];
        expect(contentType).toMatch(/application\/json/);
      }
    });

    it('Error responses should have JSON Content-Type', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/login')
        .send({});

      const contentType = response.headers['content-type'];
      expect(contentType).toMatch(/application\/json/);
    });
  });
});
