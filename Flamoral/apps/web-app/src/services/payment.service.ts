/**
 * Payment Service
 * Handles all payment-related API calls including Stripe integration
 */

import axios, { AxiosInstance } from 'axios';

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  customerId: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutSessionRequest {
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  mode: 'payment' | 'subscription' | 'setup';
  priceId?: string;
  quantity?: number;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
  allowPromotionCodes?: boolean;
}

export interface PurchaseSubscriptionRequest {
  userId: string;
  tier: string;
  priceId: string;
  email: string;
  paymentMethodId: string;
  trialDays?: number;
}

class PaymentService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Use API gateway URL - payment routes are proxied through the gateway
    this.baseURL = import.meta.env.VITE_API_URL || '';

    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Use httpOnly cookies for authentication
    });

    // Handle errors globally
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Redirect to login if unauthorized
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Create a payment intent for one-time payments
   */
  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    const response = await this.api.post('/api/v1/payments/create-intent', request);
    return response.data.data;
  }

  /**
   * Create a checkout session
   */
  async createCheckoutSession(request: CreateCheckoutSessionRequest): Promise<CheckoutSession> {
    const response = await this.api.post('/api/v1/payments/checkout/create', request);
    return response.data.data;
  }

  /**
   * Get checkout session details
   */
  async getCheckoutSession(sessionId: string): Promise<any> {
    const response = await this.api.get(`/api/v1/payments/checkout/${sessionId}`);
    return response.data.data;
  }

  /**
   * Purchase a subscription
   */
  async purchaseSubscription(request: PurchaseSubscriptionRequest): Promise<any> {
    const response = await this.api.post('/api/v1/payments/subscription/create', request);
    return response.data.data;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<void> {
    await this.api.post('/api/v1/payments/subscription/cancel', {
      subscriptionId,
      immediately,
    });
  }

  /**
   * Update subscription tier
   */
  async updateSubscriptionTier(subscriptionId: string, newPriceId: string): Promise<any> {
    const response = await this.api.post('/api/v1/payments/subscription/update-tier', {
      subscriptionId,
      newPriceId,
    });
    return response.data.data;
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(userId: string, email: string, name?: string): Promise<Customer> {
    const response = await this.api.post('/api/v1/payments/customers', {
      userId,
      email,
      name,
    });
    return response.data.data;
  }

  /**
   * Get customer details
   */
  async getCustomer(customerId: string): Promise<Customer> {
    const response = await this.api.get(`/api/v1/payments/customers/${customerId}`);
    return response.data.data;
  }

  /**
   * Get payment methods for a customer
   */
  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    const response = await this.api.get(`/api/v1/payments/methods/${customerId}`);
    return response.data.data;
  }

  /**
   * Add a payment method to a customer
   */
  async addPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    const response = await this.api.post('/api/v1/payments/methods/add', {
      customerId,
      paymentMethodId,
    });
    return response.data.data;
  }

  /**
   * Process a refund
   */
  async processRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<any> {
    const response = await this.api.post('/api/v1/payments/refund', {
      paymentIntentId,
      amount,
      reason,
    });
    return response.data.data;
  }

  /**
   * Get payment service configuration status
   */
  async getConfigurationStatus(): Promise<any> {
    const response = await this.api.get('/api/v1/payments/config/status');
    return response.data.data;
  }

  /**
   * Redirect to Stripe Checkout
   */
  redirectToCheckout(sessionId: string): void {
    // This will be implemented using Stripe.js
    // const stripe = await loadStripe(publishableKey);
    // stripe.redirectToCheckout({ sessionId });
    console.log('Redirecting to checkout with session:', sessionId);
  }

  /**
   * Get Stripe publishable key from environment
   */
  getPublishableKey(): string {
    return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  }
}

export const paymentService = new PaymentService();
export default paymentService;
