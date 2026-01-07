import {
  Controller,
  Post,
  Headers,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookService, StripeWebhookEvent, AppleWebhookEvent, GoogleWebhookEvent } from './webhook.service';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Stripe webhook endpoint
   * POST /webhooks/stripe
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Body() event: StripeWebhookEvent
  ) {
    this.logger.log(`Received Stripe webhook: ${event.type}`);

    // Verify signature in production
    if (process.env.NODE_ENV === 'production' && process.env.STRIPE_WEBHOOK_SECRET) {
      const rawBody = req.rawBody;
      if (!rawBody) {
        throw new BadRequestException('Missing raw body for signature verification');
      }

      const isValid = this.webhookService.verifyWebhookSignature(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      if (!isValid) {
        this.logger.warn('Invalid Stripe webhook signature');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const result = await this.webhookService.handleStripeWebhook(event);

    if (!result.success) {
      this.logger.error(`Failed to process Stripe webhook: ${result.error}`);
    }

    return { received: true, ...result };
  }

  /**
   * Apple App Store webhook endpoint (Server Notifications V2)
   * POST /webhooks/apple
   */
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  async handleAppleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() event: AppleWebhookEvent
  ) {
    this.logger.log(`Received Apple webhook: ${event.notificationType}`);

    // Apple uses JWT signed payloads, verification happens in the service
    // The signedPayload contains the JWS that needs to be verified with Apple's certificate

    const result = await this.webhookService.handleAppleWebhook(event);

    if (!result.success) {
      this.logger.error(`Failed to process Apple webhook: ${result.error}`);
    }

    return { received: true, ...result };
  }

  /**
   * Google Play webhook endpoint (Real-time Developer Notifications via Pub/Sub)
   * POST /webhooks/google
   */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async handleGoogleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() event: GoogleWebhookEvent
  ) {
    this.logger.log(`Received Google webhook: ${event.message?.messageId}`);

    // Google Pub/Sub authentication is typically handled by the subscription configuration
    // The push endpoint should be secured with a token parameter or OIDC authentication

    if (!event.message?.data) {
      throw new BadRequestException('Invalid Google webhook payload');
    }

    const result = await this.webhookService.handleGoogleWebhook(event);

    if (!result.success) {
      this.logger.error(`Failed to process Google webhook: ${result.error}`);
    }

    // Google Pub/Sub expects a 2xx response to acknowledge the message
    return { received: true, ...result };
  }

  /**
   * Generic webhook test endpoint for development
   * POST /webhooks/test
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async handleTestWebhook(@Body() body: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Test endpoint not available in production');
    }

    this.logger.log('Received test webhook');
    this.logger.debug('Test webhook payload:', JSON.stringify(body, null, 2));

    return {
      received: true,
      message: 'Test webhook received successfully',
      payload: body,
    };
  }
}
