/**
 * Jest test setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3004';
process.env.JWT_ACCESS_SECRET = 'test-secret-key';
process.env.AWS_S3_BUCKET_MEDIA = 'test-media-bucket';
process.env.AWS_S3_REGION = 'us-east-1';
process.env.AWS_CLOUDFRONT_URL = 'https://test-cdn.cloudfront.net';
process.env.AWS_REKOGNITION_REGION = 'us-east-1';
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
