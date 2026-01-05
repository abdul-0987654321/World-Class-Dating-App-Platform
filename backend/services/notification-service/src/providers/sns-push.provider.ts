/**
 * AWS SNS Push Notification Provider
 * Replaces Firebase Cloud Messaging (FCM) with AWS SNS for push notifications
 * Supports Android (FCM), iOS (APNS), and Web Push
 */

import {
  SNSClient,
  PublishCommand,
  CreatePlatformEndpointCommand,
  DeleteEndpointCommand,
  GetEndpointAttributesCommand,
  SetEndpointAttributesCommand,
  ListEndpointsByPlatformApplicationCommand,
} from '@aws-sdk/client-sns';

import logger from '../utils/logger';

export interface PushMessage {
  token: string; // Device token or endpoint ARN
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
  badge?: number;
  sound?: string;
  channelId?: string; // Android notification channel
}

export interface BatchPushMessage {
  tokens: string[];
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BatchPushResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  results: Array<{ token: string; success: boolean; error?: string; messageId?: string }>;
}

export interface EndpointResult {
  success: boolean;
  endpointArn?: string;
  error?: string;
}

export type Platform = 'android' | 'ios' | 'web';

export class SNSPushProvider {
  private snsClient: SNSClient;
  private initialized: boolean = false;
  private platformApplicationArns: Record<Platform, string | undefined>;

  constructor() {
    this.snsClient = new SNSClient({
      region: process.env.AWS_SNS_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined, // Use IAM role if no explicit credentials
    });

    // Platform application ARNs for different platforms
    this.platformApplicationArns = {
      android: process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID,
      ios: process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_IOS,
      web: process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB,
    };

    this.initialize();
  }

  private initialize(): void {
    const hasAnyPlatform = Object.values(this.platformApplicationArns).some((arn) => arn);

    if (hasAnyPlatform) {
      this.initialized = true;
      logger.info('SNS Push Provider initialized successfully', {
        platforms: Object.entries(this.platformApplicationArns)
          .filter(([, arn]) => arn)
          .map(([platform]) => platform),
      });
    } else {
      logger.warn(
        'SNS Push Provider: No platform application ARNs configured. Push notifications will be disabled.'
      );
    }
  }

  /**
   * Register a device token and get SNS endpoint ARN
   */
  async registerDevice(
    platform: Platform,
    deviceToken: string,
    userData?: Record<string, string>
  ): Promise<EndpointResult> {
    const platformArn = this.platformApplicationArns[platform];

    if (!platformArn) {
      return {
        success: false,
        error: `Platform ${platform} not configured`,
      };
    }

    try {
      const command = new CreatePlatformEndpointCommand({
        PlatformApplicationArn: platformArn,
        Token: deviceToken,
        CustomUserData: userData ? JSON.stringify(userData) : undefined,
      });

      const response = await this.snsClient.send(command);

      logger.info('Device registered with SNS', {
        platform,
        endpointArn: response.EndpointArn,
      });

      return {
        success: true,
        endpointArn: response.EndpointArn,
      };
    } catch (error: any) {
      // Handle case where endpoint already exists
      if (error.name === 'InvalidParameterException' && error.message?.includes('already exists')) {
        // Extract endpoint ARN from error message or try to find it
        const arnMatch = error.message.match(
          /arn:aws:sns:[^:]+:\d+:endpoint\/[^/]+\/[^/]+\/[a-f0-9-]+/
        );
        if (arnMatch) {
          // Update the token if it changed
          await this.updateEndpointToken(arnMatch[0], deviceToken);
          return {
            success: true,
            endpointArn: arnMatch[0],
          };
        }
      }

      logger.error('Failed to register device with SNS', {
        error: error.message,
        platform,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update endpoint token (for token refresh)
   */
  async updateEndpointToken(endpointArn: string, newToken: string): Promise<boolean> {
    try {
      const command = new SetEndpointAttributesCommand({
        EndpointArn: endpointArn,
        Attributes: {
          Token: newToken,
          Enabled: 'true',
        },
      });

      await this.snsClient.send(command);

      logger.info('Endpoint token updated', {
        endpointArn: endpointArn.substring(0, 50) + '...',
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to update endpoint token', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Check if endpoint is enabled
   */
  async isEndpointEnabled(endpointArn: string): Promise<boolean> {
    try {
      const command = new GetEndpointAttributesCommand({
        EndpointArn: endpointArn,
      });

      const response = await this.snsClient.send(command);
      return response.Attributes?.Enabled === 'true';
    } catch (error: any) {
      logger.error('Failed to check endpoint status', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Delete/unregister a device endpoint
   */
  async unregisterDevice(endpointArn: string): Promise<boolean> {
    try {
      const command = new DeleteEndpointCommand({
        EndpointArn: endpointArn,
      });

      await this.snsClient.send(command);

      logger.info('Device unregistered from SNS', {
        endpointArn: endpointArn.substring(0, 50) + '...',
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to unregister device', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Build platform-specific message payload
   */
  private buildMessagePayload(message: PushMessage, platform: Platform): string {
    const data = message.data || {};

    // Common notification structure
    const notification = {
      title: message.title,
      body: message.body,
      ...(message.imageUrl && { image: message.imageUrl }),
    };

    // Build platform-specific payloads
    const payload: Record<string, string> = {};

    // Android/FCM payload
    if (platform === 'android' || platform === 'web') {
      payload.GCM = JSON.stringify({
        notification: {
          ...notification,
          sound: message.sound || 'default',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          channel_id: message.channelId || 'default',
        },
        data: {
          ...data,
          title: message.title,
          body: message.body,
        },
        priority: message.priority === 'high' ? 'high' : 'normal',
      });
    }

    // iOS/APNS payload
    if (platform === 'ios') {
      payload.APNS = JSON.stringify({
        aps: {
          alert: {
            title: message.title,
            body: message.body,
          },
          badge: message.badge,
          sound: message.sound || 'default',
          'mutable-content': 1,
          'content-available': 1,
        },
        ...data,
        ...(message.imageUrl && { 'media-url': message.imageUrl }),
      });

      // Production APNS
      payload.APNS_SANDBOX = payload.APNS;
    }

    return JSON.stringify(payload);
  }

  /**
   * Detect platform from endpoint ARN
   */
  private detectPlatformFromArn(endpointArn: string): Platform {
    if (endpointArn.includes('/APNS/') || endpointArn.includes('/APNS_SANDBOX/')) {
      return 'ios';
    }
    if (endpointArn.includes('/GCM/') || endpointArn.includes('/FCM/')) {
      return 'android';
    }
    return 'web';
  }

  /**
   * Send push notification to a single device
   */
  async sendToDevice(message: PushMessage): Promise<PushResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'SNS Push Provider not initialized',
      };
    }

    try {
      // Determine if token is an endpoint ARN or raw device token
      const isEndpointArn = message.token.startsWith('arn:aws:sns:');
      const targetArn = message.token;

      // Detect platform from ARN
      const platform = isEndpointArn ? this.detectPlatformFromArn(message.token) : 'android'; // Default to Android if raw token

      // Build the message payload
      const messagePayload = this.buildMessagePayload(message, platform);

      const command = new PublishCommand({
        TargetArn: targetArn,
        Message: messagePayload,
        MessageStructure: 'json',
      });

      const response = await this.snsClient.send(command);

      logger.info('Push notification sent successfully', {
        messageId: response.MessageId,
        targetArn: targetArn.substring(0, 50) + '...',
      });

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error: any) {
      logger.error('Failed to send push notification', {
        error: error.message,
        errorCode: error.name,
        token: message.token.substring(0, 30) + '...',
      });

      // Handle disabled endpoint
      if (error.name === 'EndpointDisabledException') {
        return {
          success: false,
          error: 'Device endpoint is disabled - token may be invalid',
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToMultipleDevices(message: BatchPushMessage): Promise<BatchPushResult> {
    if (!this.initialized) {
      return {
        success: false,
        successCount: 0,
        failureCount: message.tokens.length,
        results: message.tokens.map((token) => ({
          token,
          success: false,
          error: 'SNS Push Provider not initialized',
        })),
      };
    }

    const results: Array<{ token: string; success: boolean; error?: string; messageId?: string }> =
      [];
    let successCount = 0;
    let failureCount = 0;

    // Process in parallel with concurrency limit
    const concurrencyLimit = 10;
    for (let i = 0; i < message.tokens.length; i += concurrencyLimit) {
      const batch = message.tokens.slice(i, i + concurrencyLimit);

      const batchResults = await Promise.all(
        batch.map(async (token) => {
          const result = await this.sendToDevice({
            token,
            title: message.title,
            body: message.body,
            imageUrl: message.imageUrl,
            data: message.data,
            priority: message.priority,
          });

          return {
            token,
            success: result.success,
            error: result.error,
            messageId: result.messageId,
          };
        })
      );

      for (const result of batchResults) {
        results.push(result);
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      }
    }

    logger.info('Batch push notification completed', {
      successCount,
      failureCount,
      totalTokens: message.tokens.length,
    });

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Send notification to SNS topic (for broadcast)
   */
  async sendToTopic(
    topicArn: string,
    message: {
      title: string;
      body: string;
      imageUrl?: string;
      data?: Record<string, string>;
    }
  ): Promise<PushResult> {
    try {
      // Build message for all platforms
      const payload = {
        default: message.body,
        GCM: JSON.stringify({
          notification: {
            title: message.title,
            body: message.body,
            image: message.imageUrl,
          },
          data: message.data || {},
        }),
        APNS: JSON.stringify({
          aps: {
            alert: {
              title: message.title,
              body: message.body,
            },
            sound: 'default',
          },
          ...message.data,
        }),
      };

      const command = new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(payload),
        MessageStructure: 'json',
      });

      const response = await this.snsClient.send(command);

      logger.info('Topic notification sent successfully', {
        messageId: response.MessageId,
        topicArn,
      });

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error: any) {
      logger.error('Failed to send topic notification', {
        error: error.message,
        topicArn,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate endpoint (check if it's still valid)
   */
  async validateEndpoint(endpointArn: string): Promise<boolean> {
    try {
      const command = new GetEndpointAttributesCommand({
        EndpointArn: endpointArn,
      });

      const response = await this.snsClient.send(command);
      const enabled = response.Attributes?.Enabled === 'true';
      const token = response.Attributes?.Token;

      return enabled && !!token;
    } catch (error: any) {
      logger.warn('Endpoint validation failed', {
        error: error.message,
        endpointArn: endpointArn.substring(0, 50) + '...',
      });
      return false;
    }
  }

  /**
   * Check if provider is configured and ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get configured platforms
   */
  getConfiguredPlatforms(): Platform[] {
    return Object.entries(this.platformApplicationArns)
      .filter(([, arn]) => arn)
      .map(([platform]) => platform as Platform);
  }
}

export const snsPushProvider = new SNSPushProvider();
