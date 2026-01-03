import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  DeleteMessageBatchCommand,
  GetQueueAttributesCommand,
  PurgeQueueCommand,
  ChangeMessageVisibilityCommand,
  Message,
} from '@aws-sdk/client-sqs';
import logger from '../utils/logger';

interface QueueMessage<T = any> {
  id: string;
  body: T;
  receiptHandle: string;
  attributes?: Record<string, string>;
  messageAttributes?: Record<string, any>;
}

interface SendMessageOptions {
  delaySeconds?: number;
  messageGroupId?: string; // For FIFO queues
  messageDeduplicationId?: string; // For FIFO queues
  messageAttributes?: Record<string, { DataType: string; StringValue: string }>;
}

export class SQSQueueService {
  private sqsClient: SQSClient;
  private queues: Map<string, string> = new Map();

  constructor() {
    this.sqsClient = new SQSClient({
      region: process.env.AWS_SQS_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });

    // Initialize queue URLs from environment
    this.initializeQueues();
  }

  private initializeQueues(): void {
    const queuePrefix = process.env.AWS_SQS_QUEUE_PREFIX || 'flamoral';
    const region = process.env.AWS_SQS_REGION || process.env.AWS_REGION || 'us-east-1';
    const accountId = process.env.AWS_ACCOUNT_ID || '';

    // Standard notification queues
    this.queues.set(
      'notifications',
      process.env.AWS_SQS_NOTIFICATIONS_QUEUE_URL ||
        `https://sqs.${region}.amazonaws.com/${accountId}/${queuePrefix}-notifications`
    );

    this.queues.set(
      'emails',
      process.env.AWS_SQS_EMAILS_QUEUE_URL ||
        `https://sqs.${region}.amazonaws.com/${accountId}/${queuePrefix}-emails`
    );

    this.queues.set(
      'sms',
      process.env.AWS_SQS_SMS_QUEUE_URL ||
        `https://sqs.${region}.amazonaws.com/${accountId}/${queuePrefix}-sms`
    );

    this.queues.set(
      'push',
      process.env.AWS_SQS_PUSH_QUEUE_URL ||
        `https://sqs.${region}.amazonaws.com/${accountId}/${queuePrefix}-push`
    );

    // Dead letter queue for failed messages
    this.queues.set(
      'dlq',
      process.env.AWS_SQS_DLQ_URL ||
        `https://sqs.${region}.amazonaws.com/${accountId}/${queuePrefix}-dlq`
    );

    // High priority queue for urgent notifications
    this.queues.set(
      'high-priority',
      process.env.AWS_SQS_HIGH_PRIORITY_QUEUE_URL ||
        `https://sqs.${region}.amazonaws.com/${accountId}/${queuePrefix}-high-priority`
    );
  }

  /**
   * Get queue URL by name
   */
  getQueueUrl(queueName: string): string {
    const url = this.queues.get(queueName);
    if (!url) {
      throw new Error(`Queue "${queueName}" not configured`);
    }
    return url;
  }

  /**
   * Send a single message to a queue
   */
  async sendMessage<T>(
    queueName: string,
    body: T,
    options: SendMessageOptions = {}
  ): Promise<{ messageId: string; success: boolean }> {
    try {
      const queueUrl = this.getQueueUrl(queueName);

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(body),
        DelaySeconds: options.delaySeconds,
        MessageGroupId: options.messageGroupId,
        MessageDeduplicationId: options.messageDeduplicationId,
        MessageAttributes: options.messageAttributes,
      });

      const response = await this.sqsClient.send(command);

      logger.debug(`Message sent to queue ${queueName}`, {
        messageId: response.MessageId,
        queueName,
      });

      return {
        messageId: response.MessageId || '',
        success: true,
      };
    } catch (error: any) {
      logger.error(`Failed to send message to queue ${queueName}`, {
        error: error.message,
        queueName,
      });

      return {
        messageId: '',
        success: false,
      };
    }
  }

  /**
   * Send multiple messages in a batch (max 10 per batch)
   */
  async sendMessageBatch<T>(
    queueName: string,
    messages: Array<{ id: string; body: T; options?: SendMessageOptions }>
  ): Promise<{ successful: string[]; failed: string[] }> {
    const results = { successful: [] as string[], failed: [] as string[] };

    try {
      const queueUrl = this.getQueueUrl(queueName);

      // SQS allows max 10 messages per batch
      const batches = this.chunkArray(messages, 10);

      for (const batch of batches) {
        const command = new SendMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: batch.map((msg) => ({
            Id: msg.id,
            MessageBody: JSON.stringify(msg.body),
            DelaySeconds: msg.options?.delaySeconds,
            MessageGroupId: msg.options?.messageGroupId,
            MessageDeduplicationId: msg.options?.messageDeduplicationId,
            MessageAttributes: msg.options?.messageAttributes,
          })),
        });

        const response = await this.sqsClient.send(command);

        response.Successful?.forEach((s) => results.successful.push(s.Id || ''));
        response.Failed?.forEach((f) => results.failed.push(f.Id || ''));
      }

      logger.info(`Batch send completed for queue ${queueName}`, {
        successful: results.successful.length,
        failed: results.failed.length,
      });
    } catch (error: any) {
      logger.error(`Batch send failed for queue ${queueName}`, {
        error: error.message,
      });
      results.failed = messages.map((m) => m.id);
    }

    return results;
  }

  /**
   * Receive messages from a queue
   */
  async receiveMessages<T>(
    queueName: string,
    options: {
      maxMessages?: number;
      waitTimeSeconds?: number;
      visibilityTimeout?: number;
    } = {}
  ): Promise<QueueMessage<T>[]> {
    try {
      const queueUrl = this.getQueueUrl(queueName);

      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: Math.min(options.maxMessages || 10, 10),
        WaitTimeSeconds: options.waitTimeSeconds ?? 20, // Long polling
        VisibilityTimeout: options.visibilityTimeout ?? 30,
        AttributeNames: ['All'],
        MessageAttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(command);

      const messages: QueueMessage<T>[] = (response.Messages || []).map(
        (msg: Message) => ({
          id: msg.MessageId || '',
          body: JSON.parse(msg.Body || '{}') as T,
          receiptHandle: msg.ReceiptHandle || '',
          attributes: msg.Attributes as Record<string, string>,
          messageAttributes: msg.MessageAttributes,
        })
      );

      logger.debug(`Received ${messages.length} messages from queue ${queueName}`);

      return messages;
    } catch (error: any) {
      logger.error(`Failed to receive messages from queue ${queueName}`, {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Delete a message from a queue (acknowledge processing)
   */
  async deleteMessage(
    queueName: string,
    receiptHandle: string
  ): Promise<boolean> {
    try {
      const queueUrl = this.getQueueUrl(queueName);

      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.sqsClient.send(command);

      logger.debug(`Message deleted from queue ${queueName}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to delete message from queue ${queueName}`, {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Delete multiple messages in a batch
   */
  async deleteMessageBatch(
    queueName: string,
    messages: Array<{ id: string; receiptHandle: string }>
  ): Promise<{ successful: string[]; failed: string[] }> {
    const results = { successful: [] as string[], failed: [] as string[] };

    try {
      const queueUrl = this.getQueueUrl(queueName);
      const batches = this.chunkArray(messages, 10);

      for (const batch of batches) {
        const command = new DeleteMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: batch.map((msg) => ({
            Id: msg.id,
            ReceiptHandle: msg.receiptHandle,
          })),
        });

        const response = await this.sqsClient.send(command);

        response.Successful?.forEach((s) => results.successful.push(s.Id || ''));
        response.Failed?.forEach((f) => results.failed.push(f.Id || ''));
      }
    } catch (error: any) {
      logger.error(`Batch delete failed for queue ${queueName}`, {
        error: error.message,
      });
      results.failed = messages.map((m) => m.id);
    }

    return results;
  }

  /**
   * Extend message visibility timeout
   */
  async extendVisibilityTimeout(
    queueName: string,
    receiptHandle: string,
    visibilityTimeout: number
  ): Promise<boolean> {
    try {
      const queueUrl = this.getQueueUrl(queueName);

      const command = new ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: visibilityTimeout,
      });

      await this.sqsClient.send(command);
      return true;
    } catch (error: any) {
      logger.error(`Failed to extend visibility timeout`, {
        error: error.message,
        queueName,
      });
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(
    queueName: string
  ): Promise<{
    approximateMessages: number;
    approximateMessagesNotVisible: number;
    approximateMessagesDelayed: number;
  }> {
    try {
      const queueUrl = this.getQueueUrl(queueName);

      const command = new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: [
          'ApproximateNumberOfMessages',
          'ApproximateNumberOfMessagesNotVisible',
          'ApproximateNumberOfMessagesDelayed',
        ],
      });

      const response = await this.sqsClient.send(command);

      return {
        approximateMessages: parseInt(
          response.Attributes?.ApproximateNumberOfMessages || '0',
          10
        ),
        approximateMessagesNotVisible: parseInt(
          response.Attributes?.ApproximateNumberOfMessagesNotVisible || '0',
          10
        ),
        approximateMessagesDelayed: parseInt(
          response.Attributes?.ApproximateNumberOfMessagesDelayed || '0',
          10
        ),
      };
    } catch (error: any) {
      logger.error(`Failed to get queue stats for ${queueName}`, {
        error: error.message,
      });
      return {
        approximateMessages: 0,
        approximateMessagesNotVisible: 0,
        approximateMessagesDelayed: 0,
      };
    }
  }

  /**
   * Purge all messages from a queue (use with caution!)
   */
  async purgeQueue(queueName: string): Promise<boolean> {
    try {
      const queueUrl = this.getQueueUrl(queueName);

      const command = new PurgeQueueCommand({
        QueueUrl: queueUrl,
      });

      await this.sqsClient.send(command);

      logger.warn(`Queue ${queueName} purged`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to purge queue ${queueName}`, {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get stats for all configured queues
   */
  async getAllQueueStats(): Promise<
    Record<
      string,
      {
        approximateMessages: number;
        approximateMessagesNotVisible: number;
        approximateMessagesDelayed: number;
      }
    >
  > {
    const stats: Record<string, any> = {};

    for (const [name] of this.queues) {
      stats[name] = await this.getQueueStats(name);
    }

    return stats;
  }

  // Helper method to chunk array
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export const sqsQueueService = new SQSQueueService();
