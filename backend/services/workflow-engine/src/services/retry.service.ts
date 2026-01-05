import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RetryService {
  private readonly maxAttempts: number;
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly backoffFactor: number;

  constructor(private readonly configService: ConfigService) {
    this.maxAttempts = this.configService.get<number>('retry.maxAttempts') || 3;
    this.initialDelay = this.configService.get<number>('retry.initialDelay') || 1000;
    this.maxDelay = this.configService.get<number>('retry.maxDelay') || 30000;
    this.backoffFactor = this.configService.get<number>('retry.backoffFactor') || 2;
  }

  /**
   * Check if we should retry based on attempt count
   */
  shouldRetry(attempt: number): boolean {
    return attempt < this.maxAttempts;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  getRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.initialDelay * Math.pow(this.backoffFactor, attempt),
      this.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(fn: () => Promise<T>, attempt: number = 0): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (this.shouldRetry(attempt)) {
        const delay = this.getRetryDelay(attempt);
        await this.sleep(delay);
        return this.executeWithRetry(fn, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
