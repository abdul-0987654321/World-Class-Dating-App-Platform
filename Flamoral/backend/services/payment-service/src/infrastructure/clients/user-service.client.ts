import logger from '../../utils/logger';
import { ServiceClient } from '@flamoral/shared';

interface UpdateSubscriptionDto {
  userId: string;
  tier: 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';
  stripeSubscriptionId?: string;
  status?: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'grace_period';
  currentPeriodEnd?: Date;
  gracePeriodEnd?: Date;
}

interface AddCoinsDto {
  userId: string;
  amount: number;
  transactionType: 'purchase' | 'reward' | 'refund';
  stripePaymentId: string;
  productSku: string;
}

interface ActivateBoostDto {
  userId: string;
  productSku: string;
  durationMinutes: number;
  stripePaymentId: string;
}

export class UserServiceClient {
  private client: ServiceClient;
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
    this.timeout = parseInt(process.env.USER_SERVICE_TIMEOUT || '10000', 10);

    this.client = new ServiceClient({
      baseUrl: this.baseUrl,
      serviceName: 'payment-service',
      timeout: this.timeout,
    });

    logger.info(`UserServiceClient initialized with baseUrl: ${this.baseUrl}`);
  }

  /**
   * Update user subscription in user-service
   * PUT /api/internal/subscriptions/update
   */
  async updateSubscription(data: UpdateSubscriptionDto): Promise<void> {
    try {
      logger.info(`Updating subscription for user ${data.userId} to ${data.tier}`);

      await this.client.put('/api/internal/subscriptions/update', data);

      logger.info(`Successfully updated subscription for user ${data.userId}`);
    } catch (error: any) {
      logger.error(`Failed to update subscription in user-service for user ${data.userId}:`, {
        error: error.message,
        tier: data.tier,
        status: data.status,
      });
      throw new Error(`User service update failed: ${error.message}`);
    }
  }

  /**
   * Update user subscription (legacy compatibility method)
   */
  async updateUserSubscription(userId: string, data: { subscription_tier: string; subscription_status: string }): Promise<void> {
    try {
      logger.info(`Updating user subscription (legacy) for user ${userId}`);

      await this.updateSubscription({
        userId,
        tier: this.mapTierName(data.subscription_tier),
        status: data.subscription_status as any,
      });
    } catch (error: any) {
      logger.error(`Failed to update user subscription (legacy) for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Add coins to user balance
   * POST /api/internal/coins/add
   */
  async addCoins(data: AddCoinsDto): Promise<void> {
    try {
      logger.info(`Adding ${data.amount} coins to user ${data.userId}`);

      await this.client.post('/api/internal/coins/add', data);

      logger.info(`Successfully added ${data.amount} coins to user ${data.userId}`);
    } catch (error: any) {
      logger.error(`Failed to add coins in user-service for user ${data.userId}:`, {
        error: error.message,
        amount: data.amount,
        productSku: data.productSku,
      });
      throw new Error(`User service coin add failed: ${error.message}`);
    }
  }

  /**
   * Update coin balance directly (for internal use)
   */
  async updateCoinBalance(userId: string, newBalance: number): Promise<void> {
    try {
      logger.info(`Updating coin balance for user ${userId} to ${newBalance}`);

      await this.client.put('/api/internal/coins/balance', {
        userId,
        balance: newBalance,
      });

      logger.info(`Successfully updated coin balance for user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to update coin balance in user-service for user ${userId}:`, {
        error: error.message,
        newBalance,
      });
      throw new Error(`User service coin balance update failed: ${error.message}`);
    }
  }

  /**
   * Subtract coins from user balance (for refunds)
   */
  async subtractCoins(userId: string, amount: number, reason: string): Promise<void> {
    try {
      logger.info(`Subtracting ${amount} coins from user ${userId}: ${reason}`);

      await this.client.post('/api/internal/coins/subtract', {
        userId,
        amount,
        reason,
      });

      logger.info(`Successfully subtracted ${amount} coins from user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to subtract coins in user-service for user ${userId}:`, {
        error: error.message,
        amount,
        reason,
      });
      throw new Error(`User service coin subtract failed: ${error.message}`);
    }
  }

  /**
   * Activate boost for user
   * POST /api/internal/boosts/activate
   */
  async activateBoost(data: ActivateBoostDto): Promise<void> {
    try {
      logger.info(`Activating boost for user ${data.userId}: ${data.productSku} (${data.durationMinutes} minutes)`);

      await this.client.post('/api/internal/boosts/activate', data);

      logger.info(`Successfully activated boost for user ${data.userId}`);
    } catch (error: any) {
      logger.error(`Failed to activate boost in user-service for user ${data.userId}:`, {
        error: error.message,
        productSku: data.productSku,
        durationMinutes: data.durationMinutes,
      });
      throw new Error(`User service boost activation failed: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<{ email: string; name?: string; id: string }> {
    try {
      logger.info(`Fetching user ${userId} from user-service`);

      const response = await this.client.get(`/api/internal/users/${userId}`);

      logger.info(`Successfully fetched user ${userId}`);
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get user from user-service for user ${userId}:`, {
        error: error.message,
      });
      throw new Error(`User service get user failed: ${error.message}`);
    }
  }

  /**
   * Map tier names for compatibility
   */
  mapTierName(tier: string): 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite' {
    const tierMap: Record<string, 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite'> = {
      'free': 'free',
      'basic': 'basic',
      'plus': 'plus',
      'premium': 'premium',
      'premium_plus': 'premium_plus',
      'elite': 'elite',
      // Legacy mappings for backward compatibility
      'mid': 'premium',
      'ultra': 'elite',
      'vip': 'elite',
    };

    const normalizedTier = tier.toLowerCase();
    const mappedTier = tierMap[normalizedTier];

    if (!mappedTier) {
      logger.warn(`Unknown tier "${tier}", defaulting to "free"`);
      return 'free';
    }

    return mappedTier;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error: any) {
      logger.error('User service health check failed:', error.message);
      return false;
    }
  }
}

export default new UserServiceClient();
