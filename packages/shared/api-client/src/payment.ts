import { ApiClient } from './client';
import type {
  Subscription,
  SubscriptionPlan,
  PaymentMethod,
  Transaction
} from '@connectsphere/types';

export class PaymentApi {
  constructor(private client: ApiClient) {}

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return this.client.get<SubscriptionPlan[]>('/payments/plans');
  }

  async getCurrentSubscription(): Promise<Subscription | null> {
    return this.client.get<Subscription | null>('/payments/subscription');
  }

  async subscribe(planId: string, paymentMethodId: string): Promise<Subscription> {
    return this.client.post<Subscription>('/payments/subscribe', {
      planId,
      paymentMethodId
    });
  }

  async cancelSubscription(): Promise<void> {
    return this.client.post<void>('/payments/subscription/cancel');
  }

  async updateSubscription(planId: string): Promise<Subscription> {
    return this.client.put<Subscription>('/payments/subscription', { planId });
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return this.client.get<PaymentMethod[]>('/payments/payment-methods');
  }

  async addPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    return this.client.post<PaymentMethod>('/payments/payment-methods', {
      paymentMethodId
    });
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    return this.client.delete<void>(`/payments/payment-methods/${paymentMethodId}`);
  }

  async getTransactionHistory(limit = 50, offset = 0): Promise<Transaction[]> {
    return this.client.get<Transaction[]>('/payments/transactions', {
      params: { limit, offset }
    });
  }

  async purchaseCoins(amount: number, paymentMethodId: string): Promise<Transaction> {
    return this.client.post<Transaction>('/payments/coins/purchase', {
      amount,
      paymentMethodId
    });
  }

  async getCoinBalance(): Promise<{ balance: number }> {
    return this.client.get<{ balance: number }>('/payments/coins/balance');
  }
}
