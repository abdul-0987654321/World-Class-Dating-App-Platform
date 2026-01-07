import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsEnum, IsOptional } from 'class-validator';

import { SubscriptionService, SubscriptionPlan, Subscription, SubscriptionFeatures } from './subscription.service';

class CreateSubscriptionDto {
  @IsString()
  userId: string;

  @IsEnum(['free', 'premium', 'elite', 'platinum'])
  plan: SubscriptionPlan;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}

class UpgradeSubscriptionDto {
  @IsEnum(['free', 'premium', 'elite', 'platinum'])
  newPlan: SubscriptionPlan;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Get subscription for a user
   * GET /api/v1/subscriptions/:userId
   */
  @Get(':userId')
  async getSubscription(@Param('userId') userId: string): Promise<ApiResponse<Subscription>> {
    const subscription = await this.subscriptionService.getSubscription(userId);
    return {
      success: true,
      data: subscription,
    };
  }

  /**
   * Get subscription features for a plan
   * GET /api/v1/subscriptions/plans/:plan/features
   */
  @Get('plans/:plan/features')
  getSubscriptionFeatures(
    @Param('plan') plan: SubscriptionPlan
  ): ApiResponse<SubscriptionFeatures> {
    const features = this.subscriptionService.getSubscriptionFeatures(plan);
    return {
      success: true,
      data: features,
    };
  }

  /**
   * Get all available subscription plans with features
   * GET /api/v1/subscriptions/plans
   */
  @Get('plans')
  getAllPlans(): ApiResponse<SubscriptionFeatures[]> {
    const plans: SubscriptionPlan[] = ['free', 'premium', 'elite', 'platinum'];
    const allFeatures = plans.map((plan) =>
      this.subscriptionService.getSubscriptionFeatures(plan)
    );
    return {
      success: true,
      data: allFeatures,
    };
  }

  /**
   * Create a new subscription
   * POST /api/v1/subscriptions
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @Body() createDto: CreateSubscriptionDto
  ): Promise<ApiResponse<Subscription>> {
    const subscription = await this.subscriptionService.createSubscription(
      createDto.userId,
      createDto.plan,
      createDto.paymentMethodId
    );
    return {
      success: true,
      data: subscription,
      message: `Successfully subscribed to ${createDto.plan} plan`,
    };
  }

  /**
   * Upgrade a user's subscription
   * PUT /api/v1/subscriptions/:userId/upgrade
   */
  @Put(':userId/upgrade')
  async upgradeSubscription(
    @Param('userId') userId: string,
    @Body() upgradeDto: UpgradeSubscriptionDto
  ): Promise<ApiResponse<Subscription>> {
    const subscription = await this.subscriptionService.upgradeSubscription(
      userId,
      upgradeDto.newPlan
    );
    return {
      success: true,
      data: subscription,
      message: `Successfully upgraded to ${upgradeDto.newPlan} plan`,
    };
  }

  /**
   * Cancel a user's subscription
   * DELETE /api/v1/subscriptions/:userId
   */
  @Delete(':userId')
  async cancelSubscription(@Param('userId') userId: string): Promise<ApiResponse<Subscription>> {
    const subscription = await this.subscriptionService.cancelSubscription(userId);
    return {
      success: true,
      data: subscription,
      message: 'Subscription cancelled. Access continues until end of billing period.',
    };
  }

  /**
   * Get subscription status for a user
   * GET /api/v1/subscriptions/:userId/status
   */
  @Get(':userId/status')
  async getSubscriptionStatus(@Param('userId') userId: string): Promise<
    ApiResponse<{
      isActive: boolean;
      plan: SubscriptionPlan;
      features: SubscriptionFeatures;
      expiresAt: Date;
    }>
  > {
    const subscription = await this.subscriptionService.getSubscription(userId);
    const features = this.subscriptionService.getSubscriptionFeatures(subscription.plan);

    return {
      success: true,
      data: {
        isActive: subscription.status === 'active',
        plan: subscription.plan,
        features,
        expiresAt: subscription.currentPeriodEnd,
      },
    };
  }
}
