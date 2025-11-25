// Manual mock for logger to reduce noise in tests
export default {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
