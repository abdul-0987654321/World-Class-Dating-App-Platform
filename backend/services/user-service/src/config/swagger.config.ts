import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Flamoral User Service API',
      version: '1.0.0',
      description: 'User authentication, profile management, email verification, and password reset service for Flamoral dating platform',
      contact: {
        name: 'Flamoral Engineering Team',
        email: 'engineering@flamoral.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.flamoral.com',
        description: 'Staging server',
      },
      {
        url: 'https://api.flamoral.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token from login/register response',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            date_of_birth: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['male', 'female', 'non-binary', 'other'] },
            phone_number: { type: 'string', nullable: true },
            is_verified: { type: 'boolean' },
            is_email_verified: { type: 'boolean' },
            is_phone_verified: { type: 'boolean' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Profile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            bio: { type: 'string', maxLength: 500, nullable: true },
            occupation: { type: 'string', maxLength: 100, nullable: true },
            education: { type: 'string', maxLength: 100, nullable: true },
            height: { type: 'integer', minimum: 100, maximum: 250, nullable: true },
            city: { type: 'string', nullable: true },
            state: { type: 'string', nullable: true },
            country: { type: 'string', nullable: true },
            latitude: { type: 'number', minimum: -90, maximum: 90, nullable: true },
            longitude: { type: 'number', minimum: -180, maximum: 180, nullable: true },
            interests: { type: 'array', items: { type: 'string' }, maxItems: 10 },
            languages: { type: 'array', items: { type: 'string' }, maxItems: 10 },
            is_photo_verified: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
        ProfileResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { $ref: '#/components/schemas/Profile' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        // ==================== Phase 1 Schemas ====================
        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            tier: { type: 'string', enum: ['free', 'basic', 'mid', 'ultra'], example: 'free' },
            status: { type: 'string', enum: ['active', 'canceled', 'past_due'], example: 'active' },
            start_date: { type: 'string', format: 'date-time' },
            end_date: { type: 'string', format: 'date-time', nullable: true },
            cancel_at_period_end: { type: 'boolean', example: false },
            stripe_subscription_id: { type: 'string', nullable: true },
            stripe_customer_id: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        SubscriptionFeature: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tier: { type: 'string', enum: ['free', 'basic', 'mid', 'ultra'] },
            key: { type: 'string', example: 'daily_swipes_limit' },
            value: { type: 'string', example: '100' },
            value_type: { type: 'string', enum: ['string', 'integer', 'boolean'], example: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CoinBalance: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            balance: { type: 'integer', minimum: 0, example: 500 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CoinTransaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            amount: { type: 'integer', example: 100 },
            type: { type: 'string', enum: ['purchase', 'spent', 'reward', 'refund', 'admin_adjustment'], example: 'purchase' },
            reason: { type: 'string', example: 'Coin pack purchase' },
            reference_id: { type: 'string', nullable: true },
            reference_type: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        CoinProduct: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            sku: { type: 'string', example: 'COIN_PACK_MEDIUM' },
            name: { type: 'string', example: 'Medium Coin Pack' },
            amount: { type: 'integer', example: 500 },
            bonus_coins: { type: 'integer', example: 50 },
            price: { type: 'number', format: 'float', example: 19.99 },
            currency: { type: 'string', example: 'USD' },
            stripe_price_id: { type: 'string' },
            is_active: { type: 'boolean', example: true },
            display_order: { type: 'integer', example: 2 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        BoostProduct: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            sku: { type: 'string', example: 'BOOST_1HR' },
            name: { type: 'string', example: '1 Hour Boost' },
            duration_minutes: { type: 'integer', example: 60 },
            price: { type: 'number', format: 'float', example: 7.99 },
            coin_cost: { type: 'integer', example: 80 },
            currency: { type: 'string', example: 'USD' },
            stripe_price_id: { type: 'string' },
            is_popular: { type: 'boolean', example: true },
            is_active: { type: 'boolean', example: true },
            display_order: { type: 'integer', example: 2 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        BoostInstance: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            product_sku: { type: 'string', example: 'BOOST_1HR' },
            start_time: { type: 'string', format: 'date-time' },
            end_time: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['active', 'completed', 'canceled'], example: 'active' },
            views_received: { type: 'integer', minimum: 0, example: 150 },
            likes_received: { type: 'integer', minimum: 0, example: 25 },
            coin_cost: { type: 'integer', nullable: true },
            stripe_payment_id: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        PrivacySettings: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            profile_visibility: { type: 'string', enum: ['everyone', 'matches_only', 'private'], example: 'everyone' },
            show_distance: { type: 'boolean', example: true },
            show_age: { type: 'boolean', example: true },
            show_online_status: { type: 'boolean', example: true },
            incognito_mode: { type: 'boolean', example: false },
            show_activity_status: { type: 'boolean', example: true },
            read_receipts: { type: 'boolean', example: true },
            allow_search_by_phone: { type: 'boolean', example: false },
            allow_search_by_email: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Block: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            blocked_user_id: { type: 'string', format: 'uuid' },
            reason: { type: 'string', nullable: true, example: 'Not interested' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Report: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            reporter_id: { type: 'string', format: 'uuid' },
            reported_user_id: { type: 'string', format: 'uuid' },
            report_type: {
              type: 'string',
              enum: ['inappropriate_photos', 'inappropriate_messages', 'fake_profile', 'spam', 'harassment', 'underage', 'scam', 'violence', 'hate_speech', 'other'],
              example: 'inappropriate_messages',
            },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'medium' },
            description: { type: 'string', nullable: true, maxLength: 1000 },
            status: { type: 'string', enum: ['pending', 'under_review', 'resolved', 'dismissed'], example: 'pending' },
            reviewed_by: { type: 'string', format: 'uuid', nullable: true },
            reviewed_at: { type: 'string', format: 'date-time', nullable: true },
            action_taken: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        ReportCategory: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', example: 'inappropriate_messages' },
            label: { type: 'string', example: 'Inappropriate Messages' },
            description: { type: 'string' },
            icon: { type: 'string', example: '💬' },
            severity_default: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'medium' },
            is_active: { type: 'boolean', example: true },
            display_order: { type: 'integer', example: 1 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User registration, login, and token management',
      },
      {
        name: 'Profile',
        description: 'User profile management',
      },
      {
        name: 'Verification',
        description: 'Email verification endpoints',
      },
      {
        name: 'Password Reset',
        description: 'Password reset flow',
      },
      {
        name: 'Subscriptions',
        description: 'Subscription tier management and feature access control',
      },
      {
        name: 'Coins',
        description: 'Virtual currency system - purchase, spend, and manage coin balance',
      },
      {
        name: 'Boosts',
        description: 'Profile boost system to increase visibility',
      },
      {
        name: 'Privacy',
        description: 'Privacy settings and profile visibility controls',
      },
      {
        name: 'Blocks',
        description: 'User blocking and unblocking functionality',
      },
      {
        name: 'Reports',
        description: 'User reporting and content moderation',
      },
    ],
  },
  apis: ['./src/api/routes/*.ts', './src/api/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
