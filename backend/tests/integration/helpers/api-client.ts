import supertest, { SuperTest, Test } from 'supertest';
import { sign } from 'jsonwebtoken';

/**
 * API Client helper for integration tests
 * Provides utilities for making authenticated HTTP requests
 */

export interface TestUser {
  id: string;
  email: string;
  role?: string;
}

export class ApiClient {
  private baseUrl: string;
  private client: SuperTest<Test>;
  private authToken?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.client = supertest(baseUrl);
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Generate JWT token for testing
   */
  generateToken(user: TestUser, secret: string = 'test_secret'): string {
    return sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || 'user',
      },
      secret,
      { expiresIn: '1h' }
    );
  }

  /**
   * Authenticate as a test user
   */
  authenticateAs(user: TestUser, secret?: string): void {
    const token = this.generateToken(user, secret);
    this.setAuthToken(token);
  }

  /**
   * Make GET request
   */
  async get(path: string, options?: { query?: Record<string, any> }): Promise<supertest.Response> {
    let request = this.client.get(path);

    if (this.authToken) {
      request = request.set('Authorization', `Bearer ${this.authToken}`);
    }

    if (options?.query) {
      request = request.query(options.query);
    }

    return request;
  }

  /**
   * Make POST request
   */
  async post(path: string, data?: any): Promise<supertest.Response> {
    let request = this.client.post(path);

    if (this.authToken) {
      request = request.set('Authorization', `Bearer ${this.authToken}`);
    }

    return request.send(data);
  }

  /**
   * Make PUT request
   */
  async put(path: string, data?: any): Promise<supertest.Response> {
    let request = this.client.put(path);

    if (this.authToken) {
      request = request.set('Authorization', `Bearer ${this.authToken}`);
    }

    return request.send(data);
  }

  /**
   * Make PATCH request
   */
  async patch(path: string, data?: any): Promise<supertest.Response> {
    let request = this.client.patch(path);

    if (this.authToken) {
      request = request.set('Authorization', `Bearer ${this.authToken}`);
    }

    return request.send(data);
  }

  /**
   * Make DELETE request
   */
  async delete(path: string): Promise<supertest.Response> {
    let request = this.client.delete(path);

    if (this.authToken) {
      request = request.set('Authorization', `Bearer ${this.authToken}`);
    }

    return request;
  }

  /**
   * Upload file
   */
  async uploadFile(
    path: string,
    fieldName: string,
    filePath: string,
    data?: Record<string, any>
  ): Promise<supertest.Response> {
    let request = this.client.post(path);

    if (this.authToken) {
      request = request.set('Authorization', `Bearer ${this.authToken}`);
    }

    request = request.attach(fieldName, filePath);

    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        request = request.field(key, value);
      });
    }

    return request;
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    this.authToken = undefined;
  }

  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get supertest client
   */
  getClient(): SuperTest<Test> {
    return this.client;
  }
}

/**
 * Create API client for a specific service
 */
export const createApiClient = (baseUrl: string): ApiClient => {
  return new ApiClient(baseUrl);
};

/**
 * Multi-service API client for testing microservices
 */
export class MultiServiceApiClient {
  private clients: Map<string, ApiClient> = new Map();

  /**
   * Register a service
   */
  registerService(name: string, baseUrl: string): void {
    this.clients.set(name, new ApiClient(baseUrl));
  }

  /**
   * Get client for a service
   */
  getClient(name: string): ApiClient {
    const client = this.clients.get(name);
    if (!client) {
      throw new Error(`Service '${name}' not registered`);
    }
    return client;
  }

  /**
   * Authenticate all services with the same token
   */
  authenticateAll(user: TestUser, secret?: string): void {
    const token = sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || 'user',
      },
      secret || 'test_secret',
      { expiresIn: '1h' }
    );

    this.clients.forEach((client) => {
      client.setAuthToken(token);
    });
  }

  /**
   * Clear authentication for all services
   */
  clearAllAuth(): void {
    this.clients.forEach((client) => {
      client.clearAuth();
    });
  }
}

/**
 * Create multi-service API client
 */
export const createMultiServiceClient = (): MultiServiceApiClient => {
  return new MultiServiceApiClient();
};
