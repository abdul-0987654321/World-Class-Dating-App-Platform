/// <reference types="jest" />
// Test setup file
process.env.NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock_secret';

jest.setTimeout(10000);

afterAll(async () => {
  // Add any cleanup logic here
});
