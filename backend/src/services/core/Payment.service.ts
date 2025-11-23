import { PaymentRepository, UserRepository } from '../../repositories';
import { stripeService } from '../integrations/stripe/stripe.service';
import { SUBSCRIPTION_PRICES, COIN_PACKAGES, COIN_COSTS } from '../../models/Payment.model';

export class PaymentService {
  private paymentRepo: PaymentRepository;
  private userRepo: UserRepository;

  constructor(paymentRepo: PaymentRepository, userRepo: UserRepository) {
    this.paymentRepo = paymentRepo;
    this.userRepo = userRepo;
  }

  async createSubscription(userId: string, tier: 'premium' | 'premium_plus', billingPeriod: 'monthly' | 'yearly') {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create or get Stripe customer
    const stripeCustomer = await stripeService.createCustomer(user.email, user.first_name);

    // Get price
    const price = SUBSCRIPTION_PRICES[tier][billingPeriod];

    // Create Stripe subscription
    const stripeSubscription = await stripeService.createSubscription(stripeCustomer.id, price);

    // Create subscription record
    const subscription = await this.paymentRepo.createSubscription(
      userId,
      stripeCustomer.id,
      tier,
      stripeSubscription.id
    );

    // Update user subscription tier
    const expiresAt = new Date(stripeSubscription.current_period_end * 1000);
    await this.userRepo.updateSubscription(userId, tier, expiresAt);

    // Create transaction record
    await this.paymentRepo.createTransaction(
      userId,
      'subscription',
      price,
      'usd',
      undefined,
      `${tier} subscription - ${billingPeriod}`,
      { subscriptionId: subscription.id, tier, billingPeriod }
    );

    return subscription;
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.paymentRepo.getSubscription(userId);
    if (!subscription || !subscription.stripe_subscription_id) {
      throw new Error('No active subscription found');
    }

    // Cancel on Stripe
    await stripeService.cancelSubscription(subscription.stripe_subscription_id);

    // Update subscription record
    await this.paymentRepo.cancelSubscription(userId);

    return { message: 'Subscription will be canceled at the end of the current billing period' };
  }

  async purchaseCoins(userId: string, packageIndex: number) {
    if (packageIndex < 0 || packageIndex >= COIN_PACKAGES.length) {
      throw new Error('Invalid coin package');
    }

    const coinPackage = COIN_PACKAGES[packageIndex];
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent(
      coinPackage.price,
      'usd',
      { userId, type: 'coin_purchase', coins: coinPackage.coins }
    );

    // Create transaction record
    const transaction = await this.paymentRepo.createTransaction(
      userId,
      'coin_purchase',
      coinPackage.price,
      'usd',
      paymentIntent.id,
      `Purchase ${coinPackage.coins} coins`,
      { coins: coinPackage.coins }
    );

    return {
      transaction,
      clientSecret: paymentIntent.client_secret,
    };
  }

  async confirmCoinPurchase(userId: string, paymentIntentId: string) {
    const transaction = await this.paymentRepo.getTransactionByStripeIntentId(paymentIntentId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // Update transaction status
    await this.paymentRepo.updateTransactionStatus(transaction.id, 'succeeded');

    // Add coins to user balance
    const coins = transaction.metadata?.coins || 0;
    await this.paymentRepo.createCoinTransaction(userId, coins, 'purchase', 'Coin package purchase');

    return { coins };
  }

  async spendCoins(userId: string, amount: number, reason: string) {
    const balance = await this.paymentRepo.getCoinBalance(userId);

    if (balance < amount) {
      throw new Error('Insufficient coin balance');
    }

    await this.paymentRepo.createCoinTransaction(userId, -amount, 'spend', reason);
  }

  async getCoinBalance(userId: string) {
    return await this.paymentRepo.getCoinBalance(userId);
  }

  async getCoinTransactionHistory(userId: string, limit: number = 50, offset: number = 0) {
    return await this.paymentRepo.getCoinTransactions(userId, limit, offset);
  }

  async getTransactionHistory(userId: string, limit: number = 50, offset: number = 0) {
    return await this.paymentRepo.getUserTransactions(userId, limit, offset);
  }

  async handleWebhook(event: any) {
    switch (event.type) {
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
    }
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const dbSubscription = await this.paymentRepo.getSubscriptionByStripeId(subscription.id);
    if (!dbSubscription) return;

    await this.paymentRepo.updateSubscription(dbSubscription.user_id, {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
  }

  private async handleSubscriptionDeleted(subscription: any) {
    const dbSubscription = await this.paymentRepo.getSubscriptionByStripeId(subscription.id);
    if (!dbSubscription) return;

    await this.paymentRepo.updateSubscription(dbSubscription.user_id, {
      status: 'canceled',
      canceledAt: new Date(),
    });

    // Downgrade user to free tier
    await this.userRepo.updateSubscription(dbSubscription.user_id, 'free');
  }

  private async handlePaymentSucceeded(invoice: any) {
    // Handle successful payment
  }

  private async handlePaymentFailed(invoice: any) {
    // Handle failed payment - potentially send notification to user
  }

  getCoinCosts() {
    return COIN_COSTS;
  }

  getCoinPackages() {
    return COIN_PACKAGES;
  }

  getSubscriptionPrices() {
    return SUBSCRIPTION_PRICES;
  }
}
