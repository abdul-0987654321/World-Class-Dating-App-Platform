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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';

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
   * Public endpoint - users can view plans before authentication
   */
  @Public()
  @Get('subscriptions/plans')
  @ApiOperation({ summary: 'Get all subscription plans' })
  async getPlans(@Headers('authorization') authorization?: string) {
    const headers: Record<string, string> = {};
    if (authorization) {
      headers.Authorization = authorization;
    }
    return this.proxyService.get('paymentService', '/api/v1/subscriptions/plans', headers);
  }

  /**
   * Get a specific plan
   * Public endpoint - users can view plan details before authentication
   */
  @Public()
  @Get('subscriptions/plans/:planId')
  @ApiOperation({ summary: 'Get a specific subscription plan' })
  async getPlan(
    @Headers('authorization') authorization: string | undefined,
    @Param('planId') planId: string
  ) {
    const headers: Record<string, string> = {};
    if (authorization) {
      headers.Authorization = authorization;
    }
    return this.proxyService.get(
      'paymentService',
      `/api/v1/subscriptions/plans/${planId}`,
      headers
    );
  }

  // ==================== User Subscription Endpoints ====================

  /**
   * Get current user subscription
   */
  @Get('subscriptions/me')
  @ApiOperation({ summary: 'Get current user subscription' })
  async getMySubscription(@Headers('authorization') authorization: string) {
    return this.proxyService.get('paymentService', '/api/v1/subscriptions/me', {
      Authorization: authorization,
    });
  }

  /**
   * Create a new subscription
   */
  @Post('subscriptions')
  @ApiOperation({ summary: 'Create a new subscription' })
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('paymentService', '/api/v1/payment/subscription/create', body, {
      Authorization: authorization,
    });
  }

  /**
   * Subscribe to a plan (alias for createSubscription)
   */
  @Post('subscriptions/subscribe')
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('paymentService', '/api/v1/payment/subscription/create', body, {
      Authorization: authorization,
    });
  }

  /**
   * Upgrade subscription
   */
  @Put('subscriptions/me/upgrade')
  @ApiOperation({ summary: 'Upgrade current subscription' })
  async upgradeSubscription(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.put('paymentService', '/api/v1/subscriptions/me/upgrade', body, {
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
      '/api/v1/payment/subscription/cancel',
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
  async cancelSubscriptionPost(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('paymentService', '/api/v1/payment/subscription/cancel', body, {
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
      '/api/v1/subscriptions/me/reactivate',
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
    return this.proxyService.get('paymentService', '/api/v1/payment-methods', {
      Authorization: authorization,
    });
  }

  /**
   * Add payment method
   */
  @Post('payment-methods')
  @ApiOperation({ summary: 'Add a new payment method' })
  @HttpCode(HttpStatus.CREATED)
  async addPaymentMethod(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('paymentService', '/api/v1/payment-methods', body, {
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
    return this.proxyService.delete(
      'paymentService',
      `/api/v1/payment-methods/${paymentMethodId}`,
      {
        Authorization: authorization,
      }
    );
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
      `/api/v1/payment-methods/${paymentMethodId}/default`,
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

    const path = `/api/v1/transactions${queryString.toString() ? '?' + queryString.toString() : ''}`;
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
    return this.proxyService.get('paymentService', `/api/v1/transactions/${transactionId}`, {
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
    return this.proxyService.get('paymentService', '/api/v1/purchases/products', {
      Authorization: authorization,
    });
  }

  /**
   * Purchase a product
   */
  @Post('purchases')
  @ApiOperation({ summary: 'Purchase a product' })
  @HttpCode(HttpStatus.CREATED)
  async purchaseProduct(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('paymentService', '/api/v1/purchases', body, {
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

    const path = `/api/v1/purchases/history${queryString.toString() ? '?' + queryString.toString() : ''}`;
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

    const path = `/api/v1/invoices${queryString.toString() ? '?' + queryString.toString() : ''}`;
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
    return this.proxyService.get('paymentService', `/api/v1/invoices/${invoiceId}/download`, {
      Authorization: authorization,
    });
  }

  // ==================== Webhook Endpoints ====================

  /**
   * Stripe webhook
   *
   * IMPORTANT: This endpoint receives raw body (Buffer) for Stripe signature verification.
   * The raw body is forwarded directly to the payment service which handles signature verification.
   */
  @Public()
  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(@Req() req: Request, @Headers() headers: Record<string, string>) {
    // Forward raw body to payment service for signature verification
    // req.body is a Buffer when using express.raw() middleware
    return this.proxyService.postRaw('paymentService', '/api/v1/webhooks/stripe', req.body, {
      'stripe-signature': headers['stripe-signature'],
      'content-type': 'application/json',
    });
  }

  /**
   * Paystack webhook
   */
  @Public()
  @Post('webhooks/paystack')
  @ApiOperation({ summary: 'Handle Paystack webhook events' })
  @HttpCode(HttpStatus.OK)
  async paystackWebhook(@Req() req: Request, @Headers() headers: Record<string, string>) {
    // Paystack sends JSON body - parse it from raw buffer
    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    return this.proxyService.post('paymentService', '/api/v1/webhooks/paystack', body, {
      'x-paystack-signature': headers['x-paystack-signature'],
    });
  }

  /**
   * Flutterwave webhook
   */
  @Public()
  @Post('webhooks/flutterwave')
  @ApiOperation({ summary: 'Handle Flutterwave webhook events' })
  @HttpCode(HttpStatus.OK)
  async flutterwaveWebhook(@Req() req: Request, @Headers() headers: Record<string, string>) {
    // Flutterwave sends JSON body - parse it from raw buffer
    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    return this.proxyService.post('paymentService', '/api/v1/webhooks/flutterwave', body, {
      'verif-hash': headers['verif-hash'],
    });
  }

  // ==================== Promo Code Endpoints ====================

  /**
   * Apply promo code
   */
  @Post('promo-codes/apply')
  @ApiOperation({ summary: 'Apply a promo code' })
  @HttpCode(HttpStatus.OK)
  async applyPromoCode(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('paymentService', '/api/v1/promo-codes/apply', body, {
      Authorization: authorization,
    });
  }

  /**
   * Validate promo code
   */
  @Post('promo-codes/validate')
  @ApiOperation({ summary: 'Validate a promo code' })
  @HttpCode(HttpStatus.OK)
  async validatePromoCode(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('paymentService', '/api/v1/promo-codes/validate', body, {
      Authorization: authorization,
    });
  }
}
