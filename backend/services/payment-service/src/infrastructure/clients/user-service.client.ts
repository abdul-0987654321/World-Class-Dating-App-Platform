import axios, { AxiosInstance } from 'axios';

interface UpdateSubscriptionDto {
  userId: string;
  tier: 'free' | 'basic' | 'mid' | 'ultra';
  stripeSubscriptionId?: string;
  status?: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodEnd?: Date;
}

interface AddCoinsDto {
  userId: string;
  amount: number;
  transactionType: 'purchase' | 'reward' | 'refund';
  stripePaymentId: string;
  productSku: string;
}

interface AddBoostDto {
  userId: string;
  productSku: string;
  durationMinutes: number;
  stripePaymentId: string;
}

export class UserServiceClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': process.env.SERVICE_API_KEY || 'internal-service-key',
      },
    });
  }

  /**
   * Update user subscription in user-service
   */
  async updateSubscription(data: UpdateSubscriptionDto): Promise<void> {
    try {
      await this.client.put(`/api/subscriptions/internal/update`, data);
    } catch (error: any) {
      console.error('Failed to update subscription in user-service:', error.message);
      throw new Error(`User service update failed: ${error.message}`);
    }
  }

  /**
   * Add coins to user balance
   */
  async addCoins(data: AddCoinsDto): Promise<void> {
    try {
      await this.client.post(`/api/coins/internal/add`, data);
    } catch (error: any) {
      console.error('Failed to add coins in user-service:', error.message);
      throw new Error(`User service coin add failed: ${error.message}`);
    }
  }

  /**
   * Subtract coins from user balance (for refunds)
   */
  async subtractCoins(userId: string, amount: number, reason: string): Promise<void> {
    try {
      await this.client.post(`/api/coins/internal/subtract`, {
        userId,
        amount,
        reason,
      });
    } catch (error: any) {
      console.error('Failed to subtract coins in user-service:', error.message);
      throw new Error(`User service coin subtract failed: ${error.message}`);
    }
  }

  /**
   * Activate boost for user
   */
  async activateBoost(data: AddBoostDto): Promise<void> {
    try {
      await this.client.post(`/api/boosts/internal/activate`, data);
    } catch (error: any) {
      console.error('Failed to activate boost in user-service:', error.message);
      throw new Error(`User service boost activation failed: ${error.message}`);
    }
  }

  /**
   * Send notification to user
   */
  async sendNotification(userId: string, type: string, message: string): Promise<void> {
    try {
      await this.client.post(`/api/notifications/internal/send`, {
        userId,
        type,
        message,
      });
    } catch (error: any) {
      console.error('Failed to send notification:', error.message);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<{ email: string; name?: string }> {
    try {
      const response = await this.client.get(`/api/users/internal/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get user from user-service:', error.message);
      throw new Error(`User service get user failed: ${error.message}`);
    }
  }
}

export default new UserServiceClient();
