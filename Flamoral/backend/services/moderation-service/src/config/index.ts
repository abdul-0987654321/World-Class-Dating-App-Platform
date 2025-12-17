import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3008', 10),
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
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3012',
  },

  // CSAM Detection Configuration (CRITICAL LEGAL COMPLIANCE)
  csam: {
    // Enable/disable CSAM detection (should always be true in production)
    detectionEnabled: process.env.CSAM_DETECTION_ENABLED !== 'false', // Default: true

    // Microsoft PhotoDNA Configuration
    photoDNA: {
      endpoint: process.env.PHOTODNA_ENDPOINT || '',
      apiKey: process.env.PHOTODNA_API_KEY || '',
    },

    // NCMEC CyberTipline Configuration
    ncmec: {
      endpoint: process.env.NCMEC_ENDPOINT || 'https://report.cybertip.org/api',
      apiKey: process.env.NCMEC_API_KEY || '',
      espId: process.env.NCMEC_ESP_ID || '', // Electronic Service Provider ID
      espName: process.env.NCMEC_ESP_NAME || 'Flamoral Dating Platform',
      contactEmail: process.env.NCMEC_CONTACT_EMAIL || '',
      contactPhone: process.env.NCMEC_CONTACT_PHONE || '',
      reportingEnabled: process.env.NCMEC_REPORTING_ENABLED !== 'false', // Default: true
    },

    // Content Quarantine Configuration
    quarantine: {
      storagePath: process.env.CSAM_QUARANTINE_STORAGE_PATH || '/secure/csam-quarantine',
      encryptionKey: process.env.CSAM_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), // Generate in production
    },

    // Staff Notification Configuration
    notifications: {
      emailEnabled: process.env.CSAM_EMAIL_NOTIFICATIONS_ENABLED !== 'false',
      smsEnabled: process.env.CSAM_SMS_NOTIFICATIONS_ENABLED === 'true',
      slackEnabled: process.env.CSAM_SLACK_NOTIFICATIONS_ENABLED === 'true',
      pagerDutyEnabled: process.env.CSAM_PAGERDUTY_ENABLED === 'true',
      slackWebhook: process.env.CSAM_SLACK_WEBHOOK_URL || '',
      pagerDutyKey: process.env.CSAM_PAGERDUTY_KEY || '',
      emergencyEmails: process.env.CSAM_EMERGENCY_EMAILS?.split(',') || [
        'safety@flamoral.com',
        'legal@flamoral.com',
        'ceo@flamoral.com',
      ],
      emergencyPhones: process.env.CSAM_EMERGENCY_PHONES?.split(',') || [],
    },

    // Detection Thresholds
    thresholds: {
      // Confidence score threshold for automatic quarantine (0.0 - 1.0)
      autoQuarantineThreshold: parseFloat(process.env.CSAM_AUTO_QUARANTINE_THRESHOLD || '0.70'),
      // Confidence score threshold for NCMEC reporting (0.0 - 1.0)
      ncmecReportingThreshold: parseFloat(process.env.CSAM_NCMEC_REPORTING_THRESHOLD || '0.85'),
      // Perceptual hash similarity threshold (Hamming distance)
      perceptualHashSimilarityThreshold: parseInt(process.env.CSAM_PHASH_SIMILARITY_THRESHOLD || '10'),
    },

    // Law Enforcement Portal URL
    lawEnforcementPortalUrl: process.env.LAW_ENFORCEMENT_PORTAL_URL || 'https://le-portal.flamoral.com',
  },

  // App URL for notifications
  appUrl: process.env.APP_URL || 'http://localhost:3000',
};

export default config;
