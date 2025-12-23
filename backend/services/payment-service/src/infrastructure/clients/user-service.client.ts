import logger from '../../utils/logger';
import { ServiceClient } from '@flamoral/backend-shared';

interface UpdateSubscriptionDto {
  userId: string;
  tier: 'free' | 'premium' | 'premium_plus';
  stripeSubscriptionId?: string;
  status?: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'grace_period';
  currentPeriodEnd?: Date;
  gracePeriodEnd?: Date;
  provider?: string;
  providerSubscriptionId?: string;
}

interface AddCoinsDto {
  userId: string;
  amount: number;
  transactionType: 'purchase' | 'reward' | 'refund' | 'iap_purchase';
  stripePaymentId?: string;
  productSku?: string;
  iapTransactionId?: string;
  provider?: string;
}

interface ActivateBoostDto {
  userId: string;
  productSku: string;
  durationMinutes: number;
  stripePaymentId: string;
}

interface AddBoostsDto {
  userId: string;
  amount: number;
  transactionId: string;
  provider: string;
}

interface AddSuperLikesDto {
  userId: string;
  amount: number;
  transactionId: string;
  provider: string;
}

export class UserServiceClient {
  private client: ServiceClient;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    this.client = new ServiceClient({
      baseUrl: this.baseUrl,
      serviceName: 'payment-service',
      timeout: 10000,
    });
  }

  /**
   * Update user subscription in user-service
   * PUT /api/internal/subscriptions/update
   */
  async updateSubscription(data: UpdateSubscriptionDto): Promise<void> {
    try {
      await this.client.put('/api/internal/subscriptions/update', data);
      logger.info(`Updated subscription for user ${data.userId} to ${data.tier}`);
    } catch (error: any) {
      logger.error('Failed to update subscription in user-service:', error.message);
      throw new Error(`User service update failed: ${error.message}`);
    }
  }

  /**
   * Update user subscription (legacy compatibility method)
   */
  async updateUserSubscription(userId: string, data: { subscription_tier: string; subscription_status: string }): Promise<void> {
    await this.updateSubscription({
      userId,
      tier: this.mapTierName(data.subscription_tier),
      status: data.subscription_status as any,
    });
  }

  /**
   * Get user subscription
   */
  async getSubscription(userId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/internal/users/${userId}/subscription`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get subscription from user-service:', error.message);
      throw new Error(`User service get subscription failed: ${error.message}`);
    }
  }

  /**
   * Get user wallet
   */
  async getWallet(userId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/internal/users/${userId}/wallet`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get wallet from user-service:', error.message);
      throw new Error(`User service get wallet failed: ${error.message}`);
    }
  }

  /**
   * Add coins to user balance
   * POST /api/internal/coins/add
   */
  async addCoins(data: AddCoinsDto): Promise<void> {
    try {
      await this.client.post('/api/internal/coins/add', data);
      logger.info(`Added ${data.amount} coins to user ${data.userId}`);
    } catch (error: any) {
      logger.error('Failed to add coins in user-service:', error.message);
      throw new Error(`User service coin add failed: ${error.message}`);
    }
  }

  /**
   * Update coin balance directly (for internal use)
   */
  async updateCoinBalance(userId: string, newBalance: number): Promise<void> {
    try {
      await this.client.put('/api/internal/coins/balance', {
        userId,
        balance: newBalance,
      });
      logger.info(`Updated coin balance for user ${userId} to ${newBalance}`);
    } catch (error: any) {
      logger.error('Failed to update coin balance in user-service:', error.message);
      throw new Error(`User service coin balance update failed: ${error.message}`);
    }
  }

  /**
   * Subtract coins from user balance (for refunds)
   */
  async subtractCoins(userId: string, amount: number, reason: string): Promise<void> {
    try {
      await this.client.post('/api/internal/coins/subtract', {
        userId,
        amount,
        reason,
      });
      logger.info(`Subtracted ${amount} coins from user ${userId}: ${reason}`);
    } catch (error: any) {
      logger.error('Failed to subtract coins in user-service:', error.message);
      throw new Error(`User service coin subtract failed: ${error.message}`);
    }
  }

  /**
   * Activate boost for user
   * POST /api/internal/boosts/activate
   */
  async activateBoost(data: ActivateBoostDto): Promise<void> {
    try {
      await this.client.post('/api/internal/boosts/activate', data);
      logger.info(`Activated boost for user ${data.userId}: ${data.productSku} (${data.durationMinutes} minutes)`);
    } catch (error: any) {
      logger.error('Failed to activate boost in user-service:', error.message);
      throw new Error(`User service boost activation failed: ${error.message}`);
    }
  }

  /**
   * Add boosts to user
   */
  async addBoosts(data: AddBoostsDto): Promise<void> {
    try {
      await this.client.post('/api/internal/boosts/add', data);
      logger.info(`Added ${data.amount} boost(s) to user ${data.userId}`);
    } catch (error: any) {
      logger.error('Failed to add boosts in user-service:', error.message);
      throw new Error(`User service add boosts failed: ${error.message}`);
    }
  }

  /**
   * Add super likes to user
   */
  async addSuperLikes(data: AddSuperLikesDto): Promise<void> {
    try {
      await this.client.post('/api/internal/superlikes/add', data);
      logger.info(`Added ${data.amount} super like(s) to user ${data.userId}`);
    } catch (error: any) {
      logger.error('Failed to add super likes in user-service:', error.message);
      throw new Error(`User service add super likes failed: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<{ email: string; name?: string; id: string }> {
    try {
      const response = await this.client.get(`/api/internal/users/${userId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get user from user-service:', error.message);
      throw new Error(`User service get user failed: ${error.message}`);
    }
  }

  /**
   * Map tier names for compatibility
   */
  mapTierName(tier: string): 'free' | 'premium' | 'premium_plus' {
    const tierMap: Record<string, 'free' | 'premium' | 'premium_plus'> = {
      'free': 'free',
      'basic': 'premium',
      'plus': 'premium',
      'premium': 'premium',
      'mid': 'premium',
      'ultra': 'premium_plus',
      'elite': 'premium_plus',
      'premium_plus': 'premium_plus',
    };
    return tierMap[tier.toLowerCase()] || 'free';
  }
}

export default new UserServiceClient();
