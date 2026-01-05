import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import {
  ActionConfig,
  ActionType,
  ExecutionContext,
  ActionExecutionResult,
} from '../interfaces/workflow.interface';

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Execute all actions for a workflow
   */
  async executeActions(
    actions: ActionConfig[],
    context: ExecutionContext
  ): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];

    for (const action of actions) {
      // Apply delay if configured
      if (action.delay && action.delay > 0) {
        await this.sleep(action.delay);
      }

      const startTime = Date.now();
      let result: ActionExecutionResult;

      try {
        const actionResult = await this.executeAction(action, context);
        const duration = Date.now() - startTime;

        result = {
          actionType: action.type,
          status: 'success',
          executedAt: new Date(),
          duration,
          result: actionResult,
        };

        this.logger.log(`Action ${action.type} executed successfully in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;

        result = {
          actionType: action.type,
          status: 'failed',
          executedAt: new Date(),
          duration,
          error: error.message,
        };

        this.logger.error(`Action ${action.type} failed: ${error.message}`);

        // If retry is enabled and this is not a retry attempt, throw to trigger retry
        if (action.retryOnFailure && context.attempt === 0) {
          throw error;
        }
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: ActionConfig, context: ExecutionContext): Promise<any> {
    switch (action.type) {
      case ActionType.SEND_PUSH:
        return this.sendPushNotification(action.config, context);
      case ActionType.SEND_SMS:
        return this.sendSMS(action.config, context);
      case ActionType.SEND_EMAIL:
        return this.sendEmail(action.config, context);
      case ActionType.SEND_IN_APP_MESSAGE:
        return this.sendInAppMessage(action.config, context);
      case ActionType.ADD_COINS:
        return this.addCoins(action.config, context);
      case ActionType.ACTIVATE_BOOST:
        return this.activateBoost(action.config, context);
      case ActionType.UPDATE_PROFILE_SCORE:
        return this.updateProfileScore(action.config, context);
      case ActionType.PROMOTE_USER:
        return this.promoteUser(action.config, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    config: Record<string, any>,
    context: ExecutionContext
  ): Promise<any> {
    const notificationServiceUrl = this.configService.get<string>('services.notificationService');

    const response = await axios.post(
      `${notificationServiceUrl}/api/notifications/push`,
      {
        userId: context.userId,
        title: config.title,
        body: config.body,
        data: config.data,
      },
      {
        headers: {
          'X-Internal-Service-Key': this.configService.get<string>('internalServiceKey'),
        },
      }
    );

    return response.data;
  }

  /**
   * Send SMS
   */
  private async sendSMS(config: Record<string, any>, context: ExecutionContext): Promise<any> {
    const notificationServiceUrl = this.configService.get<string>('services.notificationService');

    const response = await axios.post(
      `${notificationServiceUrl}/api/notifications/sms`,
      {
        userId: context.userId,
        message: config.message,
      },
      {
        headers: {
          'X-Internal-Service-Key': this.configService.get<string>('internalServiceKey'),
        },
      }
    );

    return response.data;
  }

  /**
   * Send email
   */
  private async sendEmail(config: Record<string, any>, context: ExecutionContext): Promise<any> {
    const notificationServiceUrl = this.configService.get<string>('services.notificationService');

    const response = await axios.post(
      `${notificationServiceUrl}/api/notifications/email`,
      {
        userId: context.userId,
        subject: config.subject,
        body: config.body,
        template: config.template,
        templateData: config.templateData,
      },
      {
        headers: {
          'X-Internal-Service-Key': this.configService.get<string>('internalServiceKey'),
        },
      }
    );

    return response.data;
  }

  /**
   * Send in-app message
   */
  private async sendInAppMessage(
    config: Record<string, any>,
    context: ExecutionContext
  ): Promise<any> {
    const notificationServiceUrl = this.configService.get<string>('services.notificationService');

    const response = await axios.post(
      `${notificationServiceUrl}/api/notifications/in-app`,
      {
        userId: context.userId,
        title: config.title,
        message: config.message,
        type: config.type || 'info',
        actionUrl: config.actionUrl,
      },
      {
        headers: {
          'X-Internal-Service-Key': this.configService.get<string>('internalServiceKey'),
        },
      }
    );

    return response.data;
  }

  /**
   * Add coins to user account
   */
  private async addCoins(config: Record<string, any>, context: ExecutionContext): Promise<any> {
    const paymentServiceUrl = this.configService.get<string>('services.paymentService');

    const response = await axios.post(
      `${paymentServiceUrl}/api/coins/add`,
      {
        userId: context.userId,
        amount: config.amount,
        reason: config.reason || 'workflow_reward',
        metadata: {
          workflowId: context.workflowId,
          executionId: context.executionId,
        },
      },
      {
        headers: {
          'X-Internal-Service-Key': this.configService.get<string>('internalServiceKey'),
        },
      }
    );

    return response.data;
  }

  /**
   * Activate boost for user
   */
  private async activateBoost(
    config: Record<string, any>,
    context: ExecutionContext
  ): Promise<any> {
    const userServiceUrl = this.configService.get<string>('services.userService');

    const response = await axios.post(
      `${userServiceUrl}/api/users/${context.userId}/boost`,
      {
        duration: config.duration || 30, // minutes
        type: config.type || 'profile_boost',
      },
      {
        headers: {
          'X-Internal-Service-Key': this.configService.get<string>('internalServiceKey'),
        },
      }
    );

    return response.data;
  }

  /**
   * Update profile score
   */
  private async updateProfileScore(
    config: Record<string, any>,
    context: ExecutionContext
  ): Promise<any> {
    const userServiceUrl = this.configService.get<string>('services.userService');

    const response = await axios.patch(
      `${userServiceUrl}/api/profiles/${context.userId}/score`,
      {
        scoreAdjustment: config.scoreAdjustment,
        reason: config.reason || 'workflow_adjustment',
      },
      {
        headers: {
          'X-Internal-Service-Key': this.configService.get<string>('internalServiceKey'),
        },
      }
    );

    return response.data;
  }

  /**
   * Promote user (increase visibility)
   */
  private async promoteUser(config: Record<string, any>, context: ExecutionContext): Promise<any> {
    const matchingServiceUrl = this.configService.get<string>('services.matchingService');

    const response = await axios.post(
      `${matchingServiceUrl}/api/promotion/promote`,
      {
        userId: context.userId,
        duration: config.duration || 60, // minutes
        priority: config.priority || 'high',
      },
      {
        headers: {
          'X-Internal-Service-Key': this.configService.get<string>('internalServiceKey'),
        },
      }
    );

    return response.data;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
