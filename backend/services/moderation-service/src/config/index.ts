import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'flamoral_moderation',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
  },

  // AWS Rekognition Configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    rekognition: {
      minConfidence: parseFloat(process.env.AWS_REKOGNITION_MIN_CONFIDENCE || '80'),
      maxLabels: parseInt(process.env.AWS_REKOGNITION_MAX_LABELS || '10'),
    },
  },

  // Azure Content Moderator Configuration
  azure: {
    contentModerator: {
      endpoint: process.env.AZURE_CONTENT_MODERATOR_ENDPOINT || '',
      apiKey: process.env.AZURE_CONTENT_MODERATOR_KEY || '',
    },
  },

  // Moderation Thresholds
  moderation: {
    image: {
      // NSFW Detection Thresholds (0.0 - 1.0)
      explicitNudity: parseFloat(process.env.THRESHOLD_EXPLICIT_NUDITY || '0.85'),
      suggestiveNudity: parseFloat(process.env.THRESHOLD_SUGGESTIVE_NUDITY || '0.70'),
      violence: parseFloat(process.env.THRESHOLD_VIOLENCE || '0.80'),
      visuallyDisturbing: parseFloat(process.env.THRESHOLD_DISTURBING || '0.75'),
      rude: parseFloat(process.env.THRESHOLD_RUDE || '0.70'),
      drugs: parseFloat(process.env.THRESHOLD_DRUGS || '0.80'),
      tobacco: parseFloat(process.env.THRESHOLD_TOBACCO || '0.70'),
      alcohol: parseFloat(process.env.THRESHOLD_ALCOHOL || '0.70'),
      gambling: parseFloat(process.env.THRESHOLD_GAMBLING || '0.75'),
      hate: parseFloat(process.env.THRESHOLD_HATE || '0.85'),
    },
    text: {
      // Text Moderation Thresholds (0.0 - 1.0)
      profanity: parseFloat(process.env.THRESHOLD_PROFANITY || '0.70'),
      sexually: parseFloat(process.env.THRESHOLD_SEXUALLY || '0.75'),
      offensive: parseFloat(process.env.THRESHOLD_OFFENSIVE || '0.70'),
      hate: parseFloat(process.env.THRESHOLD_TEXT_HATE || '0.80'),
    },
  },

  // Auto-Action Configuration
  autoAction: {
    // Auto-reject if moderation score exceeds these values
    autoRejectThreshold: parseFloat(process.env.AUTO_REJECT_THRESHOLD || '0.90'),
    // Auto-flag for manual review if score is between these values
    autoFlagThreshold: parseFloat(process.env.AUTO_FLAG_THRESHOLD || '0.70'),
    // Auto-approve if score is below this value
    autoApproveThreshold: parseFloat(process.env.AUTO_APPROVE_THRESHOLD || '0.50'),
    // Auto-suspend user after X violations
    suspensionViolationCount: parseInt(process.env.SUSPENSION_VIOLATION_COUNT || '3'),
    // Auto-ban user after X severe violations
    banViolationCount: parseInt(process.env.BAN_VIOLATION_COUNT || '5'),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  // Service URLs
  services: {
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
  },
};

export default config;
