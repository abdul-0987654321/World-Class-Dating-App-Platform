/// <reference types="jest" />
// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'messaging_service_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.WEBSOCKET_PORT = '8080';
process.env.COSMOS_ENDPOINT = 'https://test.documents.azure.com:443/';
process.env.COSMOS_KEY = 'test-cosmos-key';
process.env.COSMOS_DATABASE = 'test-database';

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Add any cleanup logic here
  await new Promise(resolve => setTimeout(resolve, 100));
});
