/**
 * Flamoral PM2 Ecosystem Configuration
 *
 * This file defines all processes managed by PM2 for the Flamoral dating platform.
 * It includes all 30 backend microservices plus the frontend build server.
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --only api-gateway
 *   pm2 restart ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 *
 * Author: Flamoral DevOps Team
 * Version: 1.0.0
 */

const path = require('path');

// Base paths
const APP_DIR = '/home/flamoral/app';
const BACKEND_DIR = `${APP_DIR}/backend`;
const FRONTEND_DIR = `${APP_DIR}/frontend`;
const LOG_DIR = '/var/log/flamoral/pm2';

// Common environment variables
const commonEnv = {
  NODE_ENV: 'production',
  TZ: 'UTC',
};

// Memory limits based on service type
const MEMORY_LIMITS = {
  gateway: '512M',
  core: '384M',
  standard: '256M',
  light: '192M',
  worker: '384M',
};

// Restart policies
const restartPolicy = {
  max_restarts: 10,
  min_uptime: '10s',
  restart_delay: 4000,
};

// Backend microservices configuration
const backendServices = [
  // API Gateway (Port 4000)
  {
    name: 'api-gateway',
    script: `${BACKEND_DIR}/services/api-gateway/dist/index.js`,
    port: 4000,
    instances: 2,
    memory: MEMORY_LIMITS.gateway,
    description: 'Main API Gateway - routes requests to microservices',
  },

  // Core Services (Ports 4001-4010)
  {
    name: 'auth-service',
    script: `${BACKEND_DIR}/services/auth/dist/index.js`,
    port: 4001,
    instances: 2,
    memory: MEMORY_LIMITS.core,
    description: 'Authentication and authorization service',
  },
  {
    name: 'user-service',
    script: `${BACKEND_DIR}/services/user/dist/index.js`,
    port: 4002,
    instances: 2,
    memory: MEMORY_LIMITS.core,
    description: 'User profile management service',
  },
  {
    name: 'matching-service',
    script: `${BACKEND_DIR}/services/matching/dist/index.js`,
    port: 4003,
    instances: 2,
    memory: MEMORY_LIMITS.core,
    description: 'AI-powered matching algorithm service',
  },
  {
    name: 'messaging-service',
    script: `${BACKEND_DIR}/services/messaging/dist/index.js`,
    port: 4004,
    instances: 2,
    memory: MEMORY_LIMITS.core,
    description: 'Real-time messaging service',
  },
  {
    name: 'video-service',
    script: `${BACKEND_DIR}/services/video/dist/index.js`,
    port: 4005,
    instances: 1,
    memory: MEMORY_LIMITS.core,
    description: 'Video calling and streaming service',
  },
  {
    name: 'notification-service',
    script: `${BACKEND_DIR}/services/notification/dist/index.js`,
    port: 4006,
    instances: 1,
    memory: MEMORY_LIMITS.standard,
    description: 'Push notification and alert service',
  },
  {
    name: 'payment-service',
    script: `${BACKEND_DIR}/services/payment/dist/index.js`,
    port: 4007,
    instances: 1,
    memory: MEMORY_LIMITS.core,
    description: 'Payment processing and subscription service',
  },
  {
    name: 'media-service',
    script: `${BACKEND_DIR}/services/media/dist/index.js`,
    port: 4008,
    instances: 2,
    memory: MEMORY_LIMITS.core,
    description: 'Image and video upload/processing service',
  },
  {
    name: 'search-service',
    script: `${BACKEND_DIR}/services/search/dist/index.js`,
    port: 4009,
    instances: 1,
    memory: MEMORY_LIMITS.standard,
    description: 'Advanced search and discovery service',
  },
  {
    name: 'analytics-service',
    script: `${BACKEND_DIR}/services/analytics/dist/index.js`,
    port: 4010,
    instances: 1,
    memory: MEMORY_LIMITS.standard,
    description: 'User analytics and insights service',
  },

  // Supporting Services (Ports 4011-4020)
  {
    name: 'verification-service',
    script: `${BACKEND_DIR}/services/verification/dist/index.js`,
    port: 4011,
    instances: 1,
    memory: MEMORY_LIMITS.standard,
    description: 'Identity and photo verification service',
  },
  {
    name: 'moderation-service',
    script: `${BACKEND_DIR}/services/moderation/dist/index.js`,
    port: 4012,
    instances: 1,
    memory: MEMORY_LIMITS.standard,
    description: 'Content moderation and safety service',
  },
  {
    name: 'location-service',
    script: `${BACKEND_DIR}/services/location/dist/index.js`,
    port: 4013,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'Geolocation and proximity service',
  },
  {
    name: 'recommendation-service',
    script: `${BACKEND_DIR}/services/recommendation/dist/index.js`,
    port: 4014,
    instances: 1,
    memory: MEMORY_LIMITS.standard,
    description: 'AI-powered recommendation engine',
  },
  {
    name: 'events-service',
    script: `${BACKEND_DIR}/services/events/dist/index.js`,
    port: 4015,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'Dating events and activities service',
  },
  {
    name: 'icebreaker-service',
    script: `${BACKEND_DIR}/services/icebreaker/dist/index.js`,
    port: 4016,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'Conversation starters and prompts service',
  },
  {
    name: 'compatibility-service',
    script: `${BACKEND_DIR}/services/compatibility/dist/index.js`,
    port: 4017,
    instances: 1,
    memory: MEMORY_LIMITS.standard,
    description: 'Compatibility scoring service',
  },
  {
    name: 'premium-service',
    script: `${BACKEND_DIR}/services/premium/dist/index.js`,
    port: 4018,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'Premium features and perks service',
  },
  {
    name: 'boost-service',
    script: `${BACKEND_DIR}/services/boost/dist/index.js`,
    port: 4019,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'Profile boost and visibility service',
  },
  {
    name: 'report-service',
    script: `${BACKEND_DIR}/services/report/dist/index.js`,
    port: 4020,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'User reporting and abuse handling service',
  },

  // Additional Services (Ports 4021-4030)
  {
    name: 'email-service',
    script: `${BACKEND_DIR}/services/email/dist/index.js`,
    port: 4021,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'Email delivery and template service',
  },
  {
    name: 'sms-service',
    script: `${BACKEND_DIR}/services/sms/dist/index.js`,
    port: 4022,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'SMS delivery service',
  },
  {
    name: 'admin-service',
    script: `${BACKEND_DIR}/services/admin/dist/index.js`,
    port: 4023,
    instances: 1,
    memory: MEMORY_LIMITS.standard,
    description: 'Admin panel backend service',
  },
  {
    name: 'audit-service',
    script: `${BACKEND_DIR}/services/audit/dist/index.js`,
    port: 4024,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'Audit logging service',
  },
  {
    name: 'cache-service',
    script: `${BACKEND_DIR}/services/cache/dist/index.js`,
    port: 4025,
    instances: 1,
    memory: MEMORY_LIMITS.standard,
    description: 'Cache management service',
  },
  {
    name: 'queue-service',
    script: `${BACKEND_DIR}/services/queue/dist/index.js`,
    port: 4026,
    instances: 1,
    memory: MEMORY_LIMITS.standard,
    description: 'Job queue management service',
  },
  {
    name: 'scheduler-service',
    script: `${BACKEND_DIR}/services/scheduler/dist/index.js`,
    port: 4027,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'Scheduled tasks and cron service',
  },
  {
    name: 'health-service',
    script: `${BACKEND_DIR}/services/health/dist/index.js`,
    port: 4028,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'Health check and monitoring service',
  },
  {
    name: 'webhook-service',
    script: `${BACKEND_DIR}/services/webhook/dist/index.js`,
    port: 4029,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'Webhook handling service',
  },
  {
    name: 'feature-flag-service',
    script: `${BACKEND_DIR}/services/feature-flag/dist/index.js`,
    port: 4030,
    instances: 1,
    memory: MEMORY_LIMITS.light,
    description: 'Feature flag management service',
  },
];

// WebSocket server configuration
const websocketServer = {
  name: 'websocket-server',
  script: `${BACKEND_DIR}/services/websocket/dist/index.js`,
  port: 5000,
  instances: 1,
  memory: MEMORY_LIMITS.gateway,
  description: 'Real-time WebSocket server',
};

// Frontend configuration
const frontendApp = {
  name: 'frontend',
  script: 'serve',
  args: '-s dist -l 5173',
  cwd: FRONTEND_DIR,
  instances: 1,
  memory: MEMORY_LIMITS.light,
  description: 'Frontend static file server',
};

// Worker processes
const workers = [
  {
    name: 'email-worker',
    script: `${BACKEND_DIR}/workers/email/dist/index.js`,
    instances: 1,
    memory: MEMORY_LIMITS.worker,
    description: 'Email queue worker',
  },
  {
    name: 'notification-worker',
    script: `${BACKEND_DIR}/workers/notification/dist/index.js`,
    instances: 1,
    memory: MEMORY_LIMITS.worker,
    description: 'Push notification queue worker',
  },
  {
    name: 'media-worker',
    script: `${BACKEND_DIR}/workers/media/dist/index.js`,
    instances: 2,
    memory: MEMORY_LIMITS.worker,
    description: 'Media processing queue worker',
  },
  {
    name: 'matching-worker',
    script: `${BACKEND_DIR}/workers/matching/dist/index.js`,
    instances: 1,
    memory: MEMORY_LIMITS.worker,
    description: 'Matching algorithm queue worker',
  },
  {
    name: 'analytics-worker',
    script: `${BACKEND_DIR}/workers/analytics/dist/index.js`,
    instances: 1,
    memory: MEMORY_LIMITS.worker,
    description: 'Analytics processing queue worker',
  },
];

// Generate PM2 app configuration
function generateAppConfig(service) {
  const config = {
    name: service.name,
    script: service.script,
    cwd: service.cwd || BACKEND_DIR,
    instances: service.instances || 1,
    exec_mode: service.instances > 1 ? 'cluster' : 'fork',
    max_memory_restart: service.memory,
    env: {
      ...commonEnv,
      PORT: service.port,
    },
    env_production: {
      ...commonEnv,
      PORT: service.port,
    },

    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: `${LOG_DIR}/${service.name}-error.log`,
    out_file: `${LOG_DIR}/${service.name}-out.log`,
    combine_logs: true,
    merge_logs: true,

    // Restart policy
    ...restartPolicy,
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', '*.log'],

    // Graceful shutdown
    kill_timeout: 10000,
    listen_timeout: 10000,
    shutdown_with_message: true,

    // Source maps
    source_map_support: true,

    // Instance variables
    instance_var: 'INSTANCE_ID',
  };

  // Add args if specified
  if (service.args) {
    config.args = service.args;
  }

  return config;
}

// Build apps array
const apps = [
  // Backend services
  ...backendServices.map(generateAppConfig),

  // WebSocket server
  generateAppConfig(websocketServer),

  // Workers
  ...workers.map((worker) => ({
    ...generateAppConfig(worker),
    exec_mode: 'fork', // Workers should always run in fork mode
    cron_restart: worker.cron_restart || undefined,
  })),

  // Frontend
  {
    name: frontendApp.name,
    script: frontendApp.script,
    args: frontendApp.args,
    cwd: frontendApp.cwd,
    instances: frontendApp.instances,
    exec_mode: 'fork',
    max_memory_restart: frontendApp.memory,
    env: {
      ...commonEnv,
    },
    env_production: {
      ...commonEnv,
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: `${LOG_DIR}/frontend-error.log`,
    out_file: `${LOG_DIR}/frontend-out.log`,
    combine_logs: true,
    ...restartPolicy,
    autorestart: true,
    watch: false,
    interpreter: 'npx',
  },
];

// Export configuration
module.exports = {
  apps,

  // Deployment configuration
  deploy: {
    production: {
      user: 'flamoral',
      host: ['flamoral.com'],
      ref: 'origin/main',
      repo: 'git@github.com:flamoral/flamoral-app.git',
      path: '/home/flamoral/app',
      'pre-deploy-local': '',
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production',
      },
    },
    staging: {
      user: 'flamoral',
      host: ['staging.flamoral.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:flamoral/flamoral-app.git',
      path: '/home/flamoral/app',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};
