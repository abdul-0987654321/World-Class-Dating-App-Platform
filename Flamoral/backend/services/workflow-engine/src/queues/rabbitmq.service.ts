import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { WorkflowExecutorService } from '../engine/workflow-executor.service';
import { TriggerType } from '../interfaces/workflow.interface';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.ChannelModel;
  private channel: amqp.Channel;
  private readonly queuePrefix: string;
  private readonly exchanges: Record<string, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly workflowExecutor: WorkflowExecutorService,
  ) {
    this.queuePrefix =
      this.configService.get<string>('rabbitmq.queuePrefix') || 'flamoral_';
    this.exchanges = this.configService.get<Record<string, string>>(
      'rabbitmq.exchanges',
    ) || {};
  }

  async onModuleInit() {
    await this.connect();
    await this.setupListeners();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Connect to RabbitMQ
   */
  private async connect(): Promise<void> {
    try {
      const rabbitmqUrl = this.configService.get<string>('rabbitmq.url');
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      this.connection.on('error', (error) => {
        this.logger.error(`RabbitMQ connection error: ${error.message}`);
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed, attempting to reconnect...');
        setTimeout(() => this.connect(), 5000);
      });

      this.logger.log('Connected to RabbitMQ successfully');
    } catch (error) {
      this.logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      setTimeout(() => this.connect(), 5000);
    }
  }

  /**
   * Disconnect from RabbitMQ
   */
  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error(`Error disconnecting from RabbitMQ: ${error.message}`);
    }
  }

  /**
   * Setup event listeners for all trigger types
   */
  private async setupListeners(): Promise<void> {
    // Match events
    await this.subscribeToQueue(
      `${this.queuePrefix}match_events`,
      this.exchanges.matching,
      'match.created',
      (msg) => this.handleMatchCreated(msg),
    );

    // Message events
    await this.subscribeToQueue(
      `${this.queuePrefix}message_events`,
      this.exchanges.messaging,
      'message.sent',
      (msg) => this.handleMessageSent(msg),
    );

    // Like events
    await this.subscribeToQueue(
      `${this.queuePrefix}like_events`,
      this.exchanges.matching,
      'like.received',
      (msg) => this.handleLikeReceived(msg),
    );

    // Super like events
    await this.subscribeToQueue(
      `${this.queuePrefix}super_like_events`,
      this.exchanges.matching,
      'super_like.received',
      (msg) => this.handleSuperLike(msg),
    );

    // Payment events
    await this.subscribeToQueue(
      `${this.queuePrefix}subscription_events`,
      this.exchanges.payment,
      'subscription.purchased',
      (msg) => this.handleSubscriptionPurchase(msg),
    );

    await this.subscribeToQueue(
      `${this.queuePrefix}coin_events`,
      this.exchanges.payment,
      'coins.purchased',
      (msg) => this.handleCoinPurchase(msg),
    );

    // User events
    await this.subscribeToQueue(
      `${this.queuePrefix}user_login_events`,
      this.exchanges.user,
      'user.first_login',
      (msg) => this.handleFirstLogin(msg),
    );

    await this.subscribeToQueue(
      `${this.queuePrefix}profile_events`,
      this.exchanges.user,
      'profile.completed',
      (msg) => this.handleProfileCompleted(msg),
    );

    await this.subscribeToQueue(
      `${this.queuePrefix}onboarding_events`,
      this.exchanges.user,
      'onboarding.abandoned',
      (msg) => this.handleAbandonedOnboarding(msg),
    );

    await this.subscribeToQueue(
      `${this.queuePrefix}inactive_user_events`,
      this.exchanges.user,
      'user.inactive_7d',
      (msg) => this.handleUserInactive7d(msg),
    );

    this.logger.log('All event listeners setup successfully');
  }

  /**
   * Subscribe to a queue
   */
  private async subscribeToQueue(
    queueName: string,
    exchange: string,
    routingKey: string,
    handler: (msg: any) => Promise<void>,
  ): Promise<void> {
    try {
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.bindQueue(queueName, exchange, routingKey);

      this.channel.consume(queueName, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await handler(content);
            this.channel.ack(msg);
          } catch (error) {
            this.logger.error(
              `Error processing message from ${queueName}: ${error.message}`,
            );
            this.channel.nack(msg, false, false);
          }
        }
      });

      this.logger.log(
        `Subscribed to queue ${queueName} with routing key ${routingKey}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to queue ${queueName}: ${error.message}`,
      );
    }
  }

  /**
   * Event handlers
   */
  private async handleMatchCreated(msg: any): Promise<void> {
    await this.workflowExecutor.triggerWorkflows(
      TriggerType.MATCH_CREATED,
      msg,
      msg.userId,
    );
  }

  private async handleMessageSent(msg: any): Promise<void> {
    await this.workflowExecutor.triggerWorkflows(
      TriggerType.MESSAGE_SENT,
      msg,
      msg.senderId,
    );
  }

  private async handleLikeReceived(msg: any): Promise<void> {
    await this.workflowExecutor.triggerWorkflows(
      TriggerType.LIKE_RECEIVED,
      msg,
      msg.receiverId,
    );
  }

  private async handleSuperLike(msg: any): Promise<void> {
    await this.workflowExecutor.triggerWorkflows(
      TriggerType.SUPER_LIKE,
      msg,
      msg.receiverId,
    );
  }

  private async handleSubscriptionPurchase(msg: any): Promise<void> {
    await this.workflowExecutor.triggerWorkflows(
      TriggerType.SUBSCRIPTION_PURCHASE,
      msg,
      msg.userId,
    );
  }

  private async handleCoinPurchase(msg: any): Promise<void> {
    await this.workflowExecutor.triggerWorkflows(
      TriggerType.COIN_PURCHASE,
      msg,
      msg.userId,
    );
  }

  private async handleFirstLogin(msg: any): Promise<void> {
    await this.workflowExecutor.triggerWorkflows(
      TriggerType.FIRST_LOGIN,
      msg,
      msg.userId,
    );
  }

  private async handleProfileCompleted(msg: any): Promise<void> {
    await this.workflowExecutor.triggerWorkflows(
      TriggerType.PROFILE_COMPLETED,
      msg,
      msg.userId,
    );
  }

  private async handleAbandonedOnboarding(msg: any): Promise<void> {
    await this.workflowExecutor.triggerWorkflows(
      TriggerType.ABANDONED_ONBOARDING,
      msg,
      msg.userId,
    );
  }

  private async handleUserInactive7d(msg: any): Promise<void> {
    await this.workflowExecutor.triggerWorkflows(
      TriggerType.USER_INACTIVE_7D,
      msg,
      msg.userId,
    );
  }

  /**
   * Publish an event to RabbitMQ
   */
  async publishEvent(
    exchange: string,
    routingKey: string,
    data: any,
  ): Promise<void> {
    try {
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(data)),
        { persistent: true },
      );
    } catch (error) {
      this.logger.error(`Failed to publish event: ${error.message}`);
    }
  }
}
