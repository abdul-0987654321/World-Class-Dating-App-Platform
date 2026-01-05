import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { Public } from '../decorators/public.decorator';
import { ProxyService } from '../services/proxy.service';

@ApiTags('subscriptions', 'payments')
@ApiBearerAuth('JWT-auth')
@Controller()
export class PaymentController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Subscription Plan Endpoints ====================

  /**
   * Get all available subscription plans
   */
  @Get('subscriptions/plans')
  @ApiOperation({ summary: 'Get all subscription plans' })
  async getPlans(@Headers('authorization') authorization: string) {
    return this.proxyService.get('paymentService', '/api/subscriptions/plans', {
      Authorization: authorization,
    });
  }

  /**
   * Get a specific plan
   */
  @Get('subscriptions/plans/:planId')
  @ApiOperation({ summary: 'Get a specific subscription plan' })
  async getPlan(@Headers('authorization') authorization: string, @Param('planId') planId: string) {
    return this.proxyService.get('paymentService', `/api/subscriptions/plans/${planId}`, {
      Authorization: authorization,
    });
  }

  // ==================== User Subscription Endpoints ====================

  /**
   * Get current user subscription
   */
  @Get('subscriptions/me')
  @ApiOperation({ summary: 'Get current user subscription' })
  async getMySubscription(@Headers('authorization') authorization: string) {
    return this.proxyService.get('paymentService', '/api/subscriptions/me', {
      Authorization: authorization,
    });
  }

  /**
   * Create a new subscription
   */
  @Post('subscriptions')
  @ApiOperation({ summary: 'Create a new subscription' })
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('paymentService', '/api/payment/subscription/create', body, {
      Authorization: authorization,
    });
  }

  /**
   * Subscribe to a plan (alias for createSubscription)
   */
  @Post('subscriptions/subscribe')
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @HttpCode(HttpStatus.CREATED)
  async subscribe(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('paymentService', '/api/payment/subscription/create', body, {
      Authorization: authorization,
    });
  }

  /**
   * Upgrade subscription
   */
  @Put('subscriptions/me/upgrade')
  @ApiOperation({ summary: 'Upgrade current subscription' })
  async upgradeSubscription(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.put('paymentService', '/api/subscriptions/me/upgrade', body, {
      Authorization: authorization,
    });
  }

  /**
   * Cancel subscription (DELETE)
   */
  @Delete('subscriptions/me')
  @ApiOperation({ summary: 'Cancel current subscription' })
  async cancelSubscription(@Headers('authorization') authorization: string) {
    return this.proxyService.post(
      'paymentService',
      '/api/payment/subscription/cancel',
      {},
      {
        Authorization: authorization,
      }
    );
  }

  /**
   * Cancel subscription (POST - frontend uses this)
   */
  @Post('subscriptions/cancel')
  @ApiOperation({ summary: 'Cancel current subscription' })
  @HttpCode(HttpStatus.OK)
  async cancelSubscriptionPost(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('paymentService', '/api/payment/subscription/cancel', body, {
      Authorization: authorization,
    });
  }

  /**
   * Reactivate subscription
   */
  @Post('subscriptions/me/reactivate')
  @ApiOperation({ summary: 'Reactivate cancelled subscription' })
  @HttpCode(HttpStatus.OK)
  async reactivateSubscription(@Headers('authorization') authorization: string) {
    return this.proxyService.post(
      'paymentService',
      '/api/subscriptions/me/reactivate',
      {},
      {
        Authorization: authorization,
      }
    );
  }

  // ==================== Payment Method Endpoints ====================

  /**
   * Get payment methods
   */
  @Get('payment-methods')
  @ApiOperation({ summary: 'Get saved payment methods' })
  async getPaymentMethods(@Headers('authorization') authorization: string) {
    return this.proxyService.get('paymentService', '/api/payment-methods', {
      Authorization: authorization,
    });
  }

  /**
   * Add payment method
   */
  @Post('payment-methods')
  @ApiOperation({ summary: 'Add a new payment method' })
  @HttpCode(HttpStatus.CREATED)
  async addPaymentMethod(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('paymentService', '/api/payment-methods', body, {
      Authorization: authorization,
    });
  }

  /**
   * Remove payment method
   */
  @Delete('payment-methods/:paymentMethodId')
  @ApiOperation({ summary: 'Remove a payment method' })
  async removePaymentMethod(
    @Headers('authorization') authorization: string,
    @Param('paymentMethodId') paymentMethodId: string
  ) {
    return this.proxyService.delete('paymentService', `/api/payment-methods/${paymentMethodId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Set default payment method
   */
  @Put('payment-methods/:paymentMethodId/default')
  @ApiOperation({ summary: 'Set default payment method' })
  async setDefaultPaymentMethod(
    @Headers('authorization') authorization: string,
    @Param('paymentMethodId') paymentMethodId: string
  ) {
    return this.proxyService.put(
      'paymentService',
      `/api/payment-methods/${paymentMethodId}/default`,
      {},
      {
        Authorization: authorization,
      }
    );
  }

  // ==================== Transaction Endpoints ====================

  /**
   * Get transaction history
   */
  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  async getTransactions(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/transactions${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('paymentService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get a specific transaction
   */
  @Get('transactions/:transactionId')
  @ApiOperation({ summary: 'Get a specific transaction' })
  async getTransaction(
    @Headers('authorization') authorization: string,
    @Param('transactionId') transactionId: string
  ) {
    return this.proxyService.get('paymentService', `/api/transactions/${transactionId}`, {
      Authorization: authorization,
    });
  }

  // ==================== In-App Purchase Endpoints ====================

  /**
   * Get available in-app purchases
   */
  @Get('purchases/products')
  @ApiOperation({ summary: 'Get available in-app purchases' })
  async getProducts(@Headers('authorization') authorization: string) {
    return this.proxyService.get('paymentService', '/api/purchases/products', {
      Authorization: authorization,
    });
  }

  /**
   * Purchase a product
   */
  @Post('purchases')
  @ApiOperation({ summary: 'Purchase a product' })
  @HttpCode(HttpStatus.CREATED)
  async purchaseProduct(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('paymentService', '/api/purchases', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get purchase history
   */
  @Get('purchases/history')
  @ApiOperation({ summary: 'Get purchase history' })
  async getPurchaseHistory(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/purchases/history${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('paymentService', path, {
      Authorization: authorization,
    });
  }

  // ==================== Invoice Endpoints ====================

  /**
   * Get invoices
   */
  @Get('invoices')
  @ApiOperation({ summary: 'Get invoices' })
  async getInvoices(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/invoices${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('paymentService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Download invoice
   */
  @Get('invoices/:invoiceId/download')
  @ApiOperation({ summary: 'Download invoice PDF' })
  async downloadInvoice(
    @Headers('authorization') authorization: string,
    @Param('invoiceId') invoiceId: string
  ) {
    return this.proxyService.get('paymentService', `/api/invoices/${invoiceId}/download`, {
      Authorization: authorization,
    });
  }

  // ==================== Webhook Endpoints ====================

  /**
   * Stripe webhook
   */
  @Public()
  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(@Body() body: any, @Headers() headers: any) {
    return this.proxyService.post('paymentService', '/api/webhooks/stripe', body, headers);
  }

  /**
   * Paystack webhook
   */
  @Public()
  @Post('webhooks/paystack')
  @ApiOperation({ summary: 'Handle Paystack webhook events' })
  @HttpCode(HttpStatus.OK)
  async paystackWebhook(@Body() body: any, @Headers() headers: any) {
    return this.proxyService.post('paymentService', '/api/webhooks/paystack', body, headers);
  }

  /**
   * Flutterwave webhook
   */
  @Public()
  @Post('webhooks/flutterwave')
  @ApiOperation({ summary: 'Handle Flutterwave webhook events' })
  @HttpCode(HttpStatus.OK)
  async flutterwaveWebhook(@Body() body: any, @Headers() headers: any) {
    return this.proxyService.post('paymentService', '/api/webhooks/flutterwave', body, headers);
  }

  // ==================== Promo Code Endpoints ====================

  /**
   * Apply promo code
   */
  @Post('promo-codes/apply')
  @ApiOperation({ summary: 'Apply a promo code' })
  @HttpCode(HttpStatus.OK)
  async applyPromoCode(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('paymentService', '/api/promo-codes/apply', body, {
      Authorization: authorization,
    });
  }

  /**
   * Validate promo code
   */
  @Post('promo-codes/validate')
  @ApiOperation({ summary: 'Validate a promo code' })
  @HttpCode(HttpStatus.OK)
  async validatePromoCode(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('paymentService', '/api/promo-codes/validate', body, {
      Authorization: authorization,
    });
  }
}
