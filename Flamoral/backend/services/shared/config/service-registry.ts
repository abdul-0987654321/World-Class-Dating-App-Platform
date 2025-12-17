/**
 * Service Registry - Centralized service configuration
 *
 * This file contains all service URLs, ports, and endpoint mappings
 * for the Flamoral dating platform microservices.
 */

export interface ServiceEndpoint {
  name: string;
  url: string;
  port: number;
  protocol: 'http' | 'https' | 'grpc' | 'ws' | 'wss';
  healthCheck: string;
  timeout: number;
  retries: number;
}

export interface ServiceConfig {
  development: Record<string, ServiceEndpoint>;
  production: Record<string, ServiceEndpoint>;
}

/**
 * Service Port Allocation
 *
 * 3001 - Auth Service
 * 3002 - User/Profile Service
 * 3003 - Reserved
 * 3004 - Messaging Service
 * 3005 - Payment Service
 * 3006 - Media Service
 * 3007 - Analytics Service
 * 3008 - Moderation Service
 * 3009 - Matching Service
 * 3010 - Admin Service
 * 3011 - Advertising Service
 * 3012 - Notification Service
 * 3013 - Workflow Engine
 * 3014 - Automation Service
 * 3015 - Policy Service
 * 4000 - API Gateway
 * 8000 - AI Service (Python FastAPI)
 * 8001 - NLP Service (Python FastAPI)
 * 8002 - Recommendation Service (Python FastAPI)
 * 8003 - Photo Analysis Service (Python FastAPI)
 * 8004 - Dating Coach Service (Python FastAPI)
 * 8005 - Content Generator Service (Python FastAPI)
 * 8081 - Realtime Service (WebSocket)
 * 5672 - RabbitMQ
 * 6379 - Redis
 * 5432 - PostgreSQL
 * 27017 - MongoDB
 */

const SERVICE_REGISTRY: ServiceConfig = {
  development: {
    'api-gateway': {
      name: 'api-gateway',
      url: process.env.API_GATEWAY_URL || 'http://localhost:4000',
      port: 4000,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 3,
    },
    'auth-service': {
      name: 'auth-service',
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      port: 3001,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 5000,
      retries: 2,
    },
    'user-service': {
      name: 'user-service',
      url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
      port: 3002,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'profile-service': {
      name: 'profile-service',
      url: process.env.PROFILE_SERVICE_URL || 'http://localhost:3002',
      port: 3002,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'messaging-service': {
      name: 'messaging-service',
      url: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3004',
      port: 3004,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 15000,
      retries: 3,
    },
    'payment-service': {
      name: 'payment-service',
      url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
      port: 3005,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'media-service': {
      name: 'media-service',
      url: process.env.MEDIA_SERVICE_URL || 'http://localhost:3006',
      port: 3006,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 45000,
      retries: 2,
    },
    'analytics-service': {
      name: 'analytics-service',
      url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3007',
      port: 3007,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 15000,
      retries: 3,
    },
    'moderation-service': {
      name: 'moderation-service',
      url: process.env.MODERATION_SERVICE_URL || 'http://localhost:3008',
      port: 3008,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 20000,
      retries: 2,
    },
    'matching-service': {
      name: 'matching-service',
      url: process.env.MATCHING_SERVICE_URL || 'http://localhost:3009',
      port: 3009,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 15000,
      retries: 3,
    },
    'admin-service': {
      name: 'admin-service',
      url: process.env.ADMIN_SERVICE_URL || 'http://localhost:3010',
      port: 3010,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'advertising-service': {
      name: 'advertising-service',
      url: process.env.ADVERTISING_SERVICE_URL || 'http://localhost:3011',
      port: 3011,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'notification-service': {
      name: 'notification-service',
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3012',
      port: 3012,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'workflow-engine': {
      name: 'workflow-engine',
      url: process.env.WORKFLOW_ENGINE_URL || 'http://localhost:3013',
      port: 3013,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'automation-service': {
      name: 'automation-service',
      url: process.env.AUTOMATION_SERVICE_URL || 'http://localhost:3014',
      port: 3014,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'policy-service': {
      name: 'policy-service',
      url: process.env.POLICY_SERVICE_URL || 'http://localhost:3015',
      port: 3015,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 5000,
      retries: 3,
    },
    'ai-service': {
      name: 'ai-service',
      url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
      port: 8000,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'nlp-service': {
      name: 'nlp-service',
      url: process.env.NLP_SERVICE_URL || 'http://localhost:8001',
      port: 8001,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'recommendation-service': {
      name: 'recommendation-service',
      url: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:8002',
      port: 8002,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'photo-analysis-service': {
      name: 'photo-analysis-service',
      url: process.env.PHOTO_ANALYSIS_SERVICE_URL || 'http://localhost:8003',
      port: 8003,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'dating-coach-service': {
      name: 'dating-coach-service',
      url: process.env.DATING_COACH_SERVICE_URL || 'http://localhost:8004',
      port: 8004,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'content-generator-service': {
      name: 'content-generator-service',
      url: process.env.CONTENT_GENERATOR_SERVICE_URL || 'http://localhost:8005',
      port: 8005,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'realtime-service': {
      name: 'realtime-service',
      url: process.env.REALTIME_SERVICE_URL || 'http://localhost:8081',
      port: 8081,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
  },
  production: {
    'api-gateway': {
      name: 'api-gateway',
      url: process.env.API_GATEWAY_URL || 'https://api.flamoral.com',
      port: 443,
      protocol: 'https',
      healthCheck: '/health',
      timeout: 30000,
      retries: 3,
    },
    'auth-service': {
      name: 'auth-service',
      url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
      port: 3001,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 5000,
      retries: 2,
    },
    'user-service': {
      name: 'user-service',
      url: process.env.USER_SERVICE_URL || 'http://user-service:3002',
      port: 3002,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'profile-service': {
      name: 'profile-service',
      url: process.env.PROFILE_SERVICE_URL || 'http://user-service:3002',
      port: 3002,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'messaging-service': {
      name: 'messaging-service',
      url: process.env.MESSAGING_SERVICE_URL || 'http://messaging-service:3004',
      port: 3004,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 15000,
      retries: 3,
    },
    'payment-service': {
      name: 'payment-service',
      url: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005',
      port: 3005,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'media-service': {
      name: 'media-service',
      url: process.env.MEDIA_SERVICE_URL || 'http://media-service:3006',
      port: 3006,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 45000,
      retries: 2,
    },
    'analytics-service': {
      name: 'analytics-service',
      url: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3007',
      port: 3007,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 15000,
      retries: 3,
    },
    'moderation-service': {
      name: 'moderation-service',
      url: process.env.MODERATION_SERVICE_URL || 'http://moderation-service:3008',
      port: 3008,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 20000,
      retries: 2,
    },
    'matching-service': {
      name: 'matching-service',
      url: process.env.MATCHING_SERVICE_URL || 'http://matching-service:3009',
      port: 3009,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 15000,
      retries: 3,
    },
    'admin-service': {
      name: 'admin-service',
      url: process.env.ADMIN_SERVICE_URL || 'http://admin-service:3010',
      port: 3010,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'advertising-service': {
      name: 'advertising-service',
      url: process.env.ADVERTISING_SERVICE_URL || 'http://advertising-service:3011',
      port: 3011,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'notification-service': {
      name: 'notification-service',
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3012',
      port: 3012,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'workflow-engine': {
      name: 'workflow-engine',
      url: process.env.WORKFLOW_ENGINE_URL || 'http://workflow-engine:3013',
      port: 3013,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'automation-service': {
      name: 'automation-service',
      url: process.env.AUTOMATION_SERVICE_URL || 'http://automation-service:3014',
      port: 3014,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
    'policy-service': {
      name: 'policy-service',
      url: process.env.POLICY_SERVICE_URL || 'http://policy-service:3015',
      port: 3015,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 5000,
      retries: 3,
    },
    'ai-service': {
      name: 'ai-service',
      url: process.env.AI_SERVICE_URL || 'http://ai-service:8000',
      port: 8000,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'nlp-service': {
      name: 'nlp-service',
      url: process.env.NLP_SERVICE_URL || 'http://nlp-service:8001',
      port: 8001,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'recommendation-service': {
      name: 'recommendation-service',
      url: process.env.RECOMMENDATION_SERVICE_URL || 'http://recommendation-service:8002',
      port: 8002,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'photo-analysis-service': {
      name: 'photo-analysis-service',
      url: process.env.PHOTO_ANALYSIS_SERVICE_URL || 'http://photo-analysis-service:8003',
      port: 8003,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'dating-coach-service': {
      name: 'dating-coach-service',
      url: process.env.DATING_COACH_SERVICE_URL || 'http://dating-coach-service:8004',
      port: 8004,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'content-generator-service': {
      name: 'content-generator-service',
      url: process.env.CONTENT_GENERATOR_SERVICE_URL || 'http://content-generator-service:8005',
      port: 8005,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 30000,
      retries: 2,
    },
    'realtime-service': {
      name: 'realtime-service',
      url: process.env.REALTIME_SERVICE_URL || 'http://realtime-service:8081',
      port: 8081,
      protocol: 'http',
      healthCheck: '/health',
      timeout: 10000,
      retries: 3,
    },
  },
};

/**
 * Get service configuration for current environment
 */
export function getServiceRegistry(): Record<string, ServiceEndpoint> {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? SERVICE_REGISTRY.production : SERVICE_REGISTRY.development;
}

/**
 * Get specific service endpoint
 */
export function getServiceEndpoint(serviceName: string): ServiceEndpoint | undefined {
  const registry = getServiceRegistry();
  return registry[serviceName];
}

/**
 * Get all service names
 */
export function getAllServiceNames(): string[] {
  return Object.keys(getServiceRegistry());
}

/**
 * Check if service exists in registry
 */
export function hasService(serviceName: string): boolean {
  return serviceName in getServiceRegistry();
}

export default SERVICE_REGISTRY;
