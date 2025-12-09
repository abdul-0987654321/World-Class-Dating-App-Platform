export default () => ({
  port: parseInt(process.env.PORT, 10) || 3011,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Configuration
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    name: process.env.DATABASE_NAME || 'workflow_engine_db',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    logging: process.env.DATABASE_LOGGING === 'true',
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  // RabbitMQ Configuration
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    queuePrefix: process.env.RABBITMQ_QUEUE_PREFIX || 'flamoral_',
    exchanges: {
      matching: 'matching.events',
      messaging: 'messaging.events',
      payment: 'payment.events',
      user: 'user.events',
      workflow: 'workflow.events',
    },
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-workflow-jwt-secret',
    accessSecret: process.env.JWT_ACCESS_SECRET || 'your-workflow-access-secret',
  },

  // Service URLs
  services: {
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    matchingService: process.env.MATCHING_SERVICE_URL || 'http://localhost:3009',
    paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
  },

  // Internal Service Communication
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || 'internal-service-key',

  // Retry Configuration
  retry: {
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS, 10) || 3,
    initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY, 10) || 1000,
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY, 10) || 30000,
    backoffFactor: parseInt(process.env.RETRY_BACKOFF_FACTOR, 10) || 2,
  },

  // Workflow Execution
  workflow: {
    executionTimeout: parseInt(process.env.WORKFLOW_EXECUTION_TIMEOUT, 10) || 300000,
    parallelLimit: parseInt(process.env.WORKFLOW_PARALLEL_LIMIT, 10) || 10,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // Health Check
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL, 10) || 30000,
  },
});
