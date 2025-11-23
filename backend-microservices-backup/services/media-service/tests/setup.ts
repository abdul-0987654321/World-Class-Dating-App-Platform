/**
 * Jest test setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3004';
process.env.JWT_ACCESS_SECRET = 'test-secret-key';
process.env.AZURE_STORAGE_ACCOUNT_NAME = 'teststorage';
process.env.AZURE_STORAGE_ACCOUNT_KEY = 'test-key';
process.env.AZURE_CONTAINER_NAME = 'test-container';
process.env.AZURE_CDN_URL = 'https://test-cdn.azureedge.net';
process.env.AZURE_CV_ENDPOINT = 'https://test.api.cognitive.microsoft.com/';
process.env.AZURE_CV_API_KEY = 'test-cv-key';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'media_service_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.MAX_FILE_SIZE = '10485760';
process.env.MAX_PHOTOS_PER_USER = '9';

// Increase test timeout for integration tests
jest.setTimeout(10000);

// Suppress console output during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
