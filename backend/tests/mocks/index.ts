/**
 * Mock Index
 * Central export for all test mocks
 */

// Stripe Mock
export {
  mockStripe,
  resetMockStripe,
  createMockCustomer,
  createMockSubscription,
  TEST_CARDS,
} from './stripe.mock';

// Twilio Mock
export {
  mockTwilio,
  resetMockTwilio,
  simulateCallAnswer,
  simulateCallEnd,
  setVerificationCode,
  createMockVideoRoom,
  addMockParticipant,
  TEST_PHONE_NUMBERS,
} from './twilio.mock';

// Verification Provider Mock
export {
  mockVerificationProvider,
  resetMockVerificationProvider,
  setFaceDetectionResult,
  setPoseDetectionResult,
  setFaceComparisonResult,
  setLivenessResult,
  setIdVerificationResult,
  VerificationError,
  VERIFICATION_ERRORS,
  TEST_IMAGES,
  TEST_POSES,
} from './verification-provider.mock';

// Reset all mocks helper
export function resetAllMocks() {
  const { resetMockStripe } = require('./stripe.mock');
  const { resetMockTwilio } = require('./twilio.mock');
  const { resetMockVerificationProvider } = require('./verification-provider.mock');

  resetMockStripe();
  resetMockTwilio();
  resetMockVerificationProvider();
  jest.clearAllMocks();
}

// Mock Redis Client
export const createMockRedis = () => ({
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  incr: jest.fn().mockResolvedValue(1),
  decr: jest.fn().mockResolvedValue(0),
  lpush: jest.fn().mockResolvedValue(1),
  rpush: jest.fn().mockResolvedValue(1),
  lpop: jest.fn(),
  rpop: jest.fn(),
  lrange: jest.fn().mockResolvedValue([]),
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  smembers: jest.fn().mockResolvedValue([]),
  sismember: jest.fn().mockResolvedValue(0),
  hset: jest.fn().mockResolvedValue(1),
  hget: jest.fn(),
  hgetall: jest.fn().mockResolvedValue({}),
  hdel: jest.fn().mockResolvedValue(1),
  publish: jest.fn().mockResolvedValue(1),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  flushdb: jest.fn().mockResolvedValue('OK'),
  quit: jest.fn().mockResolvedValue('OK'),
});

// Mock Database Pool
export const createMockDatabase = () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn(),
  }),
  end: jest.fn().mockResolvedValue(undefined),
});

// Mock HTTP Request/Response for Express
export const createMockRequest = (overrides: any = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  cookies: {},
  user: null,
  get: jest.fn(),
  header: jest.fn(),
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {
    statusCode: 200,
    locals: {},
  };

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.header = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);

  return res;
};

export const createMockNext = () => jest.fn();

// Mock Logger
export const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn().mockReturnThis(),
});

// Mock AWS S3
export const createMockS3 = () => ({
  upload: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Location: 'https://s3.amazonaws.com/bucket/key',
      Key: 'key',
      Bucket: 'bucket',
      ETag: '"etag"',
    }),
  }),
  getObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Body: Buffer.from('file content'),
      ContentType: 'image/jpeg',
    }),
  }),
  deleteObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
  getSignedUrl: jest.fn().mockReturnValue('https://signed-url.example.com'),
  getSignedUrlPromise: jest.fn().mockResolvedValue('https://signed-url.example.com'),
});

// Mock Email Service
export const createMockEmailService = () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
  sendTemplateEmail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
  sendBulkEmail: jest.fn().mockResolvedValue([{ messageId: 'mock-message-id' }]),
});

// Mock Push Notification Service
export const createMockPushNotificationService = () => ({
  sendPushNotification: jest.fn().mockResolvedValue({ success: true }),
  sendBulkPushNotification: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  registerDevice: jest.fn().mockResolvedValue({ success: true }),
  unregisterDevice: jest.fn().mockResolvedValue({ success: true }),
});

// Mock WebSocket
export const createMockWebSocket = () => ({
  send: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  readyState: 1, // OPEN
});

// Mock Socket.io
export const createMockSocketIO = () => ({
  emit: jest.fn(),
  on: jest.fn(),
  to: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  join: jest.fn(),
  leave: jest.fn(),
  disconnect: jest.fn(),
  broadcast: {
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  },
});
