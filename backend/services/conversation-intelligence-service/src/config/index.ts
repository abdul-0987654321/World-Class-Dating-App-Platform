/**
 * Conversation Intelligence Service Configuration
 */

export default {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3032', 10),

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'flamoral_conversation',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
  },

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(
    ','
  ),

  serviceApiKey: process.env.SERVICE_API_KEY || '',

  // Messaging service URL for fetching conversation history
  messagingServiceUrl: process.env.MESSAGING_SERVICE_URL || 'http://localhost:5000',

  // Connection score configuration
  connectionScore: {
    // Weight for each dimension in overall score
    weights: {
      depth: 0.3,
      reciprocity: 0.25,
      engagement: 0.25,
      progression: 0.2,
    },

    // Ghost risk thresholds
    ghostRisk: {
      lowThreshold: 25,
      mediumThreshold: 50,
      highThreshold: 75,
      // Hours without response before concern
      responseTimeWarning: 24,
      responseTimeCritical: 72,
    },

    // Milestones
    milestones: {
      firstMessage: { name: 'First Contact', score: 5 },
      tenMessages: { name: 'Getting Started', score: 20 },
      sharedInterests: { name: 'Common Ground', score: 35 },
      personalInfo: { name: 'Opening Up', score: 50 },
      vulnerability: { name: 'Real Connection', score: 65 },
      meetupDiscussion: { name: 'Making Plans', score: 80 },
    },
  },

  // Graceful exit message templates
  gracefulExitTemplates: {
    not_feeling_connection:
      "Hey, I've really enjoyed our conversation, but I don't think we're quite the right match. I wish you the best in finding your person!",
    too_busy_right_now:
      "I've appreciated getting to know you, but I realized I don't have the bandwidth for dating right now. I hope you understand!",
    found_someone_else:
      "I wanted to be honest with you - I've started seeing someone and want to focus on that. Thanks for the great conversations!",
    looking_for_different:
      "Thanks for chatting with me! I've realized I'm looking for something a bit different, but I hope you find what you're looking for.",
    other:
      "I've enjoyed our chats, but I think it's best if we part ways. Wishing you all the best!",
  },
};
