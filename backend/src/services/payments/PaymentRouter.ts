/**
 * Payment Router / Orchestrator
 *
 * Provides intelligent payment routing based on:
 * - Country/region
 * - Currency
 * - Payment method type
 * - Transaction amount
 * - Processor health/availability
 * - Custom routing rules
 * - Failover capabilities
 */

import { Pool } from 'pg';
import {
  PaymentProvider,
  PaymentMethodType,
  TransactionStatus,
  PaymentError,
  PaymentProviderError,
} from './types';
import { IPaymentProvider } from './providers/PaymentProvider.interface';
import { StripeProvider } from './providers/StripeProvider';
import { SquareProvider } from './providers/SquareProvider';
import { AdyenProvider } from './providers/AdyenProvider';
import { WiseProvider } from './providers/WiseProvider';
import { AmazonPayProvider } from './providers/AmazonPayProvider';
import { PayPalProvider } from './providers/PayPalProvider';
import { FlutterwaveProvider } from './providers/FlutterwaveProvider';
import { PaystackProvider } from './providers/PaystackProvider';

interface PaymentContext {
  amount: number;
  currency: string;
  country?: string;
  paymentMethod?: PaymentMethodType;
  customerId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  preferredProcessor?: PaymentProvider;
  excludeProcessors?: PaymentProvider[];
}

interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  processor: PaymentProvider;
  enabled: boolean;
  conditions: RoutingCondition[];
  fallbackProcessor?: PaymentProvider;
  allowFallback: boolean;
}

interface RoutingCondition {
  field: 'currency' | 'country' | 'amount' | 'paymentMethod' | 'customField';
  operator: 'equals' | 'in' | 'notIn' | 'greaterThan' | 'lessThan' | 'between' | 'contains';
  value: any;
}

interface ProcessorConfig {
  processor: PaymentProvider;
  enabled: boolean;
  priority: number;
  supportedCurrencies: string[];
  supportedCountries: string[];
  supportedPaymentMethods: string[];
  weight: number;
  isHealthy: boolean;
  successRate: number;
  avgResponseTimeMs: number;
  consecutiveFailures: number;
  maxDailyTransactions?: number;
  currentDailyTransactions: number;
}

interface HealthStatus {
  processor: PaymentProvider;
  isHealthy: boolean;
  successRate: number;
  avgResponseTimeMs: number;
  lastChecked: Date;
  consecutiveFailures: number;
}

interface RoutingDecision {
  selectedProcessor: PaymentProvider;
  fallbackProcessor?: PaymentProvider;
  matchedRule?: RoutingRule;
  reason: string;
}

export class PaymentRouter {
  private pool: Pool;
  private providers: Map<PaymentProvider, IPaymentProvider>;
  private routingRulesCache: RoutingRule[] = [];
  private processorConfigCache: Map<PaymentProvider, ProcessorConfig> = new Map();
  private cacheExpiry: Date = new Date(0);
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor(pool: Pool) {
    this.pool = pool;
    this.providers = new Map();
    this.initializeProviders();
  }

  /**
   * Initialize all payment providers
   */
  private async initializeProviders(): Promise<void> {
    const providerInstances: [PaymentProvider, IPaymentProvider][] = [
      [PaymentProvider.STRIPE, new StripeProvider()],
      [PaymentProvider.SQUARE, new SquareProvider()],
      [PaymentProvider.ADYEN, new AdyenProvider()],
      [PaymentProvider.WISE, new WiseProvider()],
      [PaymentProvider.AMAZON_PAY, new AmazonPayProvider()],
      [PaymentProvider.PAYPAL, new PayPalProvider()],
      [PaymentProvider.FLUTTERWAVE, new FlutterwaveProvider()],
      [PaymentProvider.PAYSTACK, new PaystackProvider()],
    ];

    for (const [name, provider] of providerInstances) {
      try {
        await provider.initialize();
        if (provider.isConfigured) {
          this.providers.set(name, provider);
        }
      } catch (error: any) {
        console.warn(`Failed to initialize ${name}: ${error.message}`);
      }
    }
  }

  /**
   * Get a specific provider instance
   */
  getProvider(name: PaymentProvider): IPaymentProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all configured providers
   */
  getConfiguredProviders(): PaymentProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Select the best processor for a payment context
   */
  async selectProcessor(context: PaymentContext): Promise<IPaymentProvider> {
    await this.refreshCacheIfNeeded();

    const decision = await this.makeRoutingDecision(context);

    const provider = this.providers.get(decision.selectedProcessor);
    if (!provider) {
      throw new PaymentError(
        `Selected processor ${decision.selectedProcessor} is not available`,
        'PROCESSOR_UNAVAILABLE'
      );
    }

    return provider;
  }

  /**
   * Make a routing decision based on context and rules
   */
  async makeRoutingDecision(context: PaymentContext): Promise<RoutingDecision> {
    await this.refreshCacheIfNeeded();

    // 1. Check for preferred processor
    if (context.preferredProcessor) {
      const preferredConfig = this.processorConfigCache.get(context.preferredProcessor);
      if (preferredConfig?.enabled && preferredConfig.isHealthy) {
        if (this.isProcessorCompatible(preferredConfig, context)) {
          return {
            selectedProcessor: context.preferredProcessor,
            reason: 'User preferred processor',
          };
        }
      }
    }

    // 2. Check routing rules in priority order
    for (const rule of this.routingRulesCache) {
      if (!rule.enabled) continue;
      if (context.excludeProcessors?.includes(rule.processor)) continue;

      const processorConfig = this.processorConfigCache.get(rule.processor);
      if (!processorConfig?.enabled || !processorConfig.isHealthy) continue;

      if (this.evaluateRule(rule, context)) {
        return {
          selectedProcessor: rule.processor,
          fallbackProcessor: rule.fallbackProcessor,
          matchedRule: rule,
          reason: `Matched rule: ${rule.name}`,
        };
      }
    }

    // 3. Find best available processor
    const availableProcessors = this.findAvailableProcessors(context);

    if (availableProcessors.length === 0) {
      throw new PaymentError(
        'No available payment processor for the given context',
        'NO_PROCESSOR_AVAILABLE',
        undefined,
        { context }
      );
    }

    // Sort by priority, health, and success rate
    availableProcessors.sort((a, b) => {
      // First by priority (higher is better)
      if (b.priority !== a.priority) return b.priority - a.priority;
      // Then by health
      if (b.isHealthy !== a.isHealthy) return b.isHealthy ? 1 : -1;
      // Then by success rate
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      // Then by weight
      return b.weight - a.weight;
    });

    const selected = availableProcessors[0];
    const fallback = availableProcessors[1];

    return {
      selectedProcessor: selected.processor,
      fallbackProcessor: fallback?.processor,
      reason: 'Best available processor based on priority and health',
    };
  }

  /**
   * Execute an operation with automatic failover
   */
  async executeWithFailover<T>(
    operation: (provider: IPaymentProvider) => Promise<T>,
    context: PaymentContext,
    maxRetries: number = 2
  ): Promise<{ result: T; usedFallback: boolean; processor: PaymentProvider }> {
    const decision = await this.makeRoutingDecision(context);
    let currentProcessor = decision.selectedProcessor;
    let attempts = 0;
    let lastError: Error | null = null;
    let usedFallback = false;

    const processorsToTry = [decision.selectedProcessor];
    if (decision.fallbackProcessor) {
      processorsToTry.push(decision.fallbackProcessor);
    }

    for (const processorName of processorsToTry) {
      const provider = this.providers.get(processorName);
      if (!provider) continue;

      try {
        const result = await operation(provider);

        // Record success
        await this.recordProcessorMetric(processorName, true);

        return {
          result,
          usedFallback: processorName !== decision.selectedProcessor,
          processor: processorName,
        };
      } catch (error: any) {
        lastError = error;
        attempts++;

        // Record failure
        await this.recordProcessorMetric(processorName, false, error);

        // If it's a validation error, don't try fallback
        if (this.isValidationError(error)) {
          throw error;
        }

        // Log the failure
        console.warn(`Processor ${processorName} failed: ${error.message}`);
        usedFallback = true;
      }
    }

    // All processors failed
    throw lastError || new PaymentError(
      'All payment processors failed',
      'ALL_PROCESSORS_FAILED'
    );
  }

  /**
   * Get health status for all processors
   */
  async getProcessorHealth(): Promise<Map<PaymentProvider, HealthStatus>> {
    await this.refreshCacheIfNeeded();

    const health = new Map<PaymentProvider, HealthStatus>();

    for (const [processor, config] of this.processorConfigCache) {
      health.set(processor, {
        processor,
        isHealthy: config.isHealthy,
        successRate: config.successRate,
        avgResponseTimeMs: config.avgResponseTimeMs,
        lastChecked: new Date(),
        consecutiveFailures: config.consecutiveFailures,
      });
    }

    return health;
  }

  /**
   * Refresh the cache if expired
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    if (new Date() < this.cacheExpiry) return;

    await Promise.all([
      this.loadRoutingRules(),
      this.loadProcessorConfigs(),
    ]);

    this.cacheExpiry = new Date(Date.now() + this.CACHE_TTL_MS);
  }

  /**
   * Load routing rules from database
   */
  private async loadRoutingRules(): Promise<void> {
    try {
      const result = await this.pool.query(`
        SELECT id, name, priority, processor, enabled, conditions,
               fallback_processor, allow_fallback
        FROM routing_rules
        WHERE enabled = true
        ORDER BY priority DESC
      `);

      this.routingRulesCache = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        priority: row.priority,
        processor: row.processor as PaymentProvider,
        enabled: row.enabled,
        conditions: row.conditions || [],
        fallbackProcessor: row.fallback_processor as PaymentProvider | undefined,
        allowFallback: row.allow_fallback,
      }));
    } catch (error) {
      console.warn('Failed to load routing rules, using defaults');
      this.routingRulesCache = [];
    }
  }

  /**
   * Load processor configurations from database
   */
  private async loadProcessorConfigs(): Promise<void> {
    try {
      const result = await this.pool.query(`
        SELECT processor, enabled, priority, supported_currencies,
               supported_countries, supported_payment_methods, weight,
               is_healthy, success_rate, avg_response_time_ms,
               consecutive_failures, max_daily_transactions,
               current_daily_transactions
        FROM processor_configs
        WHERE enabled = true
      `);

      this.processorConfigCache.clear();

      for (const row of result.rows) {
        this.processorConfigCache.set(row.processor as PaymentProvider, {
          processor: row.processor as PaymentProvider,
          enabled: row.enabled,
          priority: row.priority,
          supportedCurrencies: row.supported_currencies || [],
          supportedCountries: row.supported_countries || [],
          supportedPaymentMethods: row.supported_payment_methods || [],
          weight: row.weight,
          isHealthy: row.is_healthy,
          successRate: parseFloat(row.success_rate) || 100,
          avgResponseTimeMs: row.avg_response_time_ms || 0,
          consecutiveFailures: row.consecutive_failures || 0,
          maxDailyTransactions: row.max_daily_transactions,
          currentDailyTransactions: row.current_daily_transactions || 0,
        });
      }
    } catch (error) {
      console.warn('Failed to load processor configs, using defaults');
      this.loadDefaultProcessorConfigs();
    }
  }

  /**
   * Load default processor configurations when database is unavailable
   */
  private loadDefaultProcessorConfigs(): void {
    const defaults: ProcessorConfig[] = [
      {
        processor: PaymentProvider.STRIPE,
        enabled: true,
        priority: 100,
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        supportedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR'],
        supportedPaymentMethods: ['card', 'apple_pay', 'google_pay'],
        weight: 100,
        isHealthy: true,
        successRate: 100,
        avgResponseTimeMs: 0,
        consecutiveFailures: 0,
        currentDailyTransactions: 0,
      },
      {
        processor: PaymentProvider.SQUARE,
        enabled: true,
        priority: 90,
        supportedCurrencies: ['USD', 'CAD', 'AUD', 'GBP', 'EUR', 'JPY'],
        supportedCountries: ['US', 'CA', 'AU', 'GB', 'JP'],
        supportedPaymentMethods: ['card', 'apple_pay', 'google_pay'],
        weight: 80,
        isHealthy: true,
        successRate: 100,
        avgResponseTimeMs: 0,
        consecutiveFailures: 0,
        currentDailyTransactions: 0,
      },
      {
        processor: PaymentProvider.ADYEN,
        enabled: true,
        priority: 85,
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN'],
        supportedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'ES', 'IT', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'PL'],
        supportedPaymentMethods: ['card', 'apple_pay', 'google_pay', 'ideal', 'sepa', 'klarna'],
        weight: 70,
        isHealthy: true,
        successRate: 100,
        avgResponseTimeMs: 0,
        consecutiveFailures: 0,
        currentDailyTransactions: 0,
      },
    ];

    for (const config of defaults) {
      if (this.providers.has(config.processor)) {
        this.processorConfigCache.set(config.processor, config);
      }
    }
  }

  /**
   * Evaluate a routing rule against the payment context
   */
  private evaluateRule(rule: RoutingRule, context: PaymentContext): boolean {
    if (rule.conditions.length === 0) {
      // No conditions = matches everything (default rule)
      return true;
    }

    return rule.conditions.every(condition => this.evaluateCondition(condition, context));
  }

  /**
   * Evaluate a single routing condition
   */
  private evaluateCondition(condition: RoutingCondition, context: PaymentContext): boolean {
    let fieldValue: any;

    switch (condition.field) {
      case 'currency':
        fieldValue = context.currency?.toUpperCase();
        break;
      case 'country':
        fieldValue = context.country?.toUpperCase();
        break;
      case 'amount':
        fieldValue = context.amount;
        break;
      case 'paymentMethod':
        fieldValue = context.paymentMethod;
        break;
      case 'customField':
        fieldValue = context.metadata?.[condition.value?.fieldName];
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'notIn':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'greaterThan':
        return typeof fieldValue === 'number' && fieldValue > condition.value;
      case 'lessThan':
        return typeof fieldValue === 'number' && fieldValue < condition.value;
      case 'between':
        return typeof fieldValue === 'number' &&
          fieldValue >= condition.value.min &&
          fieldValue <= condition.value.max;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
      default:
        return false;
    }
  }

  /**
   * Check if a processor is compatible with the payment context
   */
  private isProcessorCompatible(config: ProcessorConfig, context: PaymentContext): boolean {
    // Check currency
    if (context.currency && config.supportedCurrencies.length > 0) {
      if (!config.supportedCurrencies.includes(context.currency.toUpperCase())) {
        return false;
      }
    }

    // Check country
    if (context.country && config.supportedCountries.length > 0) {
      if (!config.supportedCountries.includes(context.country.toUpperCase())) {
        return false;
      }
    }

    // Check payment method
    if (context.paymentMethod && config.supportedPaymentMethods.length > 0) {
      if (!config.supportedPaymentMethods.includes(context.paymentMethod)) {
        return false;
      }
    }

    // Check daily transaction limit
    if (config.maxDailyTransactions !== undefined) {
      if (config.currentDailyTransactions >= config.maxDailyTransactions) {
        return false;
      }
    }

    return true;
  }

  /**
   * Find all available processors for a payment context
   */
  private findAvailableProcessors(context: PaymentContext): ProcessorConfig[] {
    const available: ProcessorConfig[] = [];

    for (const [processor, config] of this.processorConfigCache) {
      // Skip excluded processors
      if (context.excludeProcessors?.includes(processor)) continue;

      // Skip unhealthy processors (but include if it's the only option)
      // if (!config.isHealthy) continue;

      // Check compatibility
      if (this.isProcessorCompatible(config, context)) {
        available.push(config);
      }
    }

    return available;
  }

  /**
   * Record a processor metric (success/failure)
   */
  private async recordProcessorMetric(
    processor: PaymentProvider,
    success: boolean,
    error?: Error
  ): Promise<void> {
    try {
      if (success) {
        await this.pool.query(`
          UPDATE processor_configs
          SET consecutive_failures = 0,
              is_healthy = true,
              current_daily_transactions = current_daily_transactions + 1,
              success_rate = LEAST(100, success_rate + 0.1),
              updated_at = NOW()
          WHERE processor = $1
        `, [processor]);
      } else {
        await this.pool.query(`
          UPDATE processor_configs
          SET consecutive_failures = consecutive_failures + 1,
              last_failure = NOW(),
              is_healthy = CASE WHEN consecutive_failures >= 5 THEN false ELSE is_healthy END,
              success_rate = GREATEST(0, success_rate - 1),
              updated_at = NOW()
          WHERE processor = $1
        `, [processor]);
      }

      // Invalidate cache
      this.cacheExpiry = new Date(0);
    } catch (err) {
      console.warn('Failed to record processor metric:', err);
    }
  }

  /**
   * Check if an error is a validation error (should not trigger failover)
   */
  private isValidationError(error: Error): boolean {
    if (error instanceof PaymentProviderError) {
      const validationCodes = [
        'VALIDATION_ERROR',
        'INVALID_CARD',
        'INSUFFICIENT_FUNDS',
        'CARD_DECLINED',
        'EXPIRED_CARD',
        'INVALID_CVV',
        'INVALID_AMOUNT',
      ];
      return validationCodes.some(code =>
        error.providerErrorCode?.includes(code) || error.code?.includes(code)
      );
    }
    return false;
  }

  /**
   * Get routing analytics
   */
  async getRoutingAnalytics(startDate: Date, endDate: Date): Promise<{
    totalTransactions: number;
    byProcessor: { processor: PaymentProvider; count: number; successRate: number }[];
    failoverRate: number;
    ruleMatchRates: { ruleId: string; ruleName: string; matchCount: number }[];
  }> {
    try {
      const transactionResult = await this.pool.query(`
        SELECT
          provider,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*)::float * 100 as success_rate
        FROM payment_transactions
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY provider
      `, [startDate, endDate]);

      const failoverResult = await this.pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN used_fallback = true THEN 1 END) as failover_count
        FROM payment_transactions
        WHERE created_at >= $1 AND created_at <= $2
      `, [startDate, endDate]);

      const totalTransactions = failoverResult.rows[0]?.total || 0;
      const failoverCount = failoverResult.rows[0]?.failover_count || 0;

      return {
        totalTransactions,
        byProcessor: transactionResult.rows.map(row => ({
          processor: row.provider as PaymentProvider,
          count: parseInt(row.count),
          successRate: parseFloat(row.success_rate) || 0,
        })),
        failoverRate: totalTransactions > 0 ? (failoverCount / totalTransactions) * 100 : 0,
        ruleMatchRates: [], // Would require additional tracking
      };
    } catch (error) {
      console.error('Failed to get routing analytics:', error);
      return {
        totalTransactions: 0,
        byProcessor: [],
        failoverRate: 0,
        ruleMatchRates: [],
      };
    }
  }
}

// Export singleton factory
let routerInstance: PaymentRouter | null = null;

export function getPaymentRouter(pool: Pool): PaymentRouter {
  if (!routerInstance) {
    routerInstance = new PaymentRouter(pool);
  }
  return routerInstance;
}

export default PaymentRouter;
