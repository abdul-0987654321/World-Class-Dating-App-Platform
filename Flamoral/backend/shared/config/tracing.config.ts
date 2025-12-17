/**
 * OpenTelemetry Tracing Configuration for Flamoral Platform
 *
 * Features:
 * - Distributed tracing with OpenTelemetry
 * - Jaeger exporter for trace visualization
 * - Azure Monitor exporter for Application Insights
 * - Automatic instrumentation for HTTP, gRPC, and databases
 * - Custom span creation and context propagation
 * - W3C Trace Context propagation
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import {
  SemanticResourceAttributes,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis-4';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import {
  trace,
  context,
  SpanStatusCode,
  Span,
  Tracer,
  Context,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { CompositePropagator, W3CBaggagePropagator } from '@opentelemetry/core';

export interface TracingConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  enabled?: boolean;
  jaegerEndpoint?: string;
  otlpEndpoint?: string;
  sampleRate?: number;
  enableConsoleExporter?: boolean;
}

let sdk: NodeSDK | null = null;
let tracer: Tracer | null = null;

/**
 * Initialize OpenTelemetry tracing
 */
export function initializeTracing(config: TracingConfig): void {
  // Skip if disabled
  if (config.enabled === false) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('OpenTelemetry tracing disabled');
    }
    return;
  }

  const environment = config.environment || process.env.NODE_ENV || 'development';
  const serviceVersion = config.serviceVersion || process.env.APP_VERSION || '1.0.0';
  const isProduction = environment === 'production';

  // Create resource with service information
  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
    'service.namespace': 'flamoral',
    'service.instance.id': process.env.HOSTNAME || process.pid.toString(),
  });

  // Configure span processors and exporters
  const spanProcessors: BatchSpanProcessor[] = [];

  // Jaeger exporter for trace visualization
  const jaegerEndpoint = config.jaegerEndpoint || process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces';
  if (jaegerEndpoint && isProduction) {
    const jaegerExporter = new JaegerExporter({
      endpoint: jaegerEndpoint,
      maxPacketSize: 65000,
    });
    spanProcessors.push(new BatchSpanProcessor(jaegerExporter));
    if (!isProduction) {
      console.log(`✓ Jaeger exporter configured: ${jaegerEndpoint}`);
    }
  }

  // OTLP exporter for OpenTelemetry Collector or Azure Monitor
  const otlpEndpoint = config.otlpEndpoint || process.env.OTLP_ENDPOINT;
  if (otlpEndpoint) {
    const otlpExporter = new OTLPTraceExporter({
      url: otlpEndpoint,
      headers: {},
    });
    spanProcessors.push(new BatchSpanProcessor(otlpExporter));
    if (!isProduction) {
      console.log(`✓ OTLP exporter configured: ${otlpEndpoint}`);
    }
  }

  // Console exporter for development only
  if (config.enableConsoleExporter || (!isProduction && !jaegerEndpoint && !otlpEndpoint)) {
    spanProcessors.push(new BatchSpanProcessor(new ConsoleSpanExporter()));
    if (!isProduction) {
      console.log('✓ Console exporter enabled for development');
    }
  }

  // Initialize OpenTelemetry SDK
  sdk = new NodeSDK({
    resource,
    spanProcessors,
    instrumentations: [
      // Auto-instrumentations
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable file system instrumentation (too noisy)
        },
      }),

      // HTTP instrumentation
      new HttpInstrumentation({
        requestHook: (span, request) => {
          span.setAttribute('http.client_ip', request.socket?.remoteAddress || 'unknown');
        },
        ignoreIncomingRequestHook: (request) => {
          // Ignore health check endpoints
          const url = request.url || '';
          return url.includes('/health') || url.includes('/metrics');
        },
      }),

      // Express instrumentation
      new ExpressInstrumentation(),

      // NestJS instrumentation
      new NestInstrumentation(),

      // Database instrumentations
      new PgInstrumentation({
        enhancedDatabaseReporting: true,
      }),
      new MongoDBInstrumentation({
        enhancedDatabaseReporting: true,
      }),

      // Redis instrumentations
      new RedisInstrumentation(),
      new IORedisInstrumentation(),
    ],
    textMapPropagator: new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    }),
    sampler: createSampler(config.sampleRate || (isProduction ? 0.1 : 1.0)),
  });

  // Start the SDK
  sdk.start();

  // Only log initialization in non-production
  if (!isProduction) {
    console.log(`✓ OpenTelemetry initialized for ${config.serviceName}`);
  }

  // Get tracer instance
  tracer = trace.getTracer(config.serviceName, serviceVersion);

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    try {
      await sdk?.shutdown();
      if (!isProduction) {
        console.log('OpenTelemetry SDK shut down successfully');
      }
    } catch (error) {
      // Always log shutdown errors as they indicate issues
      console.error('Error shutting down OpenTelemetry SDK', error);
    }
  });
}

/**
 * Create a custom sampler based on sample rate
 */
function createSampler(sampleRate: number) {
  return {
    shouldSample: (context: any, traceId: string, spanName: string, spanKind: any, attributes: any, links: any) => {
      // Always sample errors
      if (attributes['http.status_code'] >= 500) {
        return { decision: 1 }; // RECORD_AND_SAMPLED
      }

      // Sample based on rate
      const random = Math.random();
      if (random < sampleRate) {
        return { decision: 1 }; // RECORD_AND_SAMPLED
      }

      return { decision: 0 }; // NOT_RECORD
    },
    toString: () => `CustomSampler{sampleRate=${sampleRate}}`,
  };
}

/**
 * Get the tracer instance
 */
export function getTracer(): Tracer {
  if (!tracer) {
    throw new Error('Tracer not initialized. Call initializeTracing() first.');
  }
  return tracer;
}

/**
 * Create a custom span
 */
export function createSpan(
  name: string,
  options?: {
    attributes?: Record<string, any>;
    kind?: number;
  }
): Span {
  const tracer = getTracer();
  const span = tracer.startSpan(name, {
    attributes: options?.attributes,
    kind: options?.kind,
  });
  return span;
}

/**
 * Execute a function within a span
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: {
    attributes?: Record<string, any>;
    kind?: number;
  }
): Promise<T> {
  const span = createSpan(name, options);

  try {
    const result = await context.with(trace.setSpan(context.active(), span), async () => {
      return await fn(span);
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    span.end();
    throw error;
  }
}

/**
 * Add attributes to current span
 */
export function addSpanAttributes(attributes: Record<string, any>): void {
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    Object.entries(attributes).forEach(([key, value]) => {
      currentSpan.setAttribute(key, value);
    });
  }
}

/**
 * Add event to current span
 */
export function addSpanEvent(name: string, attributes?: Record<string, any>): void {
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    currentSpan.addEvent(name, attributes);
  }
}

/**
 * Record exception in current span
 */
export function recordSpanException(error: Error, attributes?: Record<string, any>): void {
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    currentSpan.recordException(error);
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        currentSpan.setAttribute(key, value);
      });
    }
    currentSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

/**
 * Get current span context
 */
export function getCurrentSpanContext() {
  const currentSpan = trace.getActiveSpan();
  return currentSpan?.spanContext();
}

/**
 * Get trace ID from current context
 */
export function getTraceId(): string | undefined {
  const spanContext = getCurrentSpanContext();
  return spanContext?.traceId;
}

/**
 * Get span ID from current context
 */
export function getSpanId(): string | undefined {
  const spanContext = getCurrentSpanContext();
  return spanContext?.spanId;
}

/**
 * Express middleware to add tracing headers
 */
export function tracingMiddleware() {
  return (req: any, res: any, next: any) => {
    const traceId = getTraceId();
    const spanId = getSpanId();

    if (traceId) {
      req.traceId = traceId;
      res.setHeader('X-Trace-ID', traceId);
    }

    if (spanId) {
      req.spanId = spanId;
      res.setHeader('X-Span-ID', spanId);
    }

    next();
  };
}

/**
 * Trace database query
 */
export async function traceDbQuery<T>(
  operation: string,
  query: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    `db.${operation}`,
    async (span) => {
      span.setAttribute('db.system', 'postgresql');
      span.setAttribute('db.statement', query.substring(0, 500)); // Limit query length
      span.setAttribute('db.operation', operation);
      return await fn();
    },
    { kind: 2 } // CLIENT
  );
}

/**
 * Trace cache operation
 */
export async function traceCacheOperation<T>(
  operation: string,
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    `cache.${operation}`,
    async (span) => {
      span.setAttribute('cache.system', 'redis');
      span.setAttribute('cache.operation', operation);
      span.setAttribute('cache.key', key);
      return await fn();
    },
    { kind: 2 } // CLIENT
  );
}

/**
 * Trace HTTP call
 */
export async function traceHttpCall<T>(
  method: string,
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    `http.${method.toLowerCase()}`,
    async (span) => {
      span.setAttribute('http.method', method);
      span.setAttribute('http.url', url);
      return await fn();
    },
    { kind: 2 } // CLIENT
  );
}

/**
 * Trace business operation
 */
export async function traceBusinessOperation<T>(
  operationName: string,
  metadata: Record<string, any>,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    operationName,
    async (span) => {
      Object.entries(metadata).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
      return await fn();
    },
    { kind: 1 } // INTERNAL
  );
}

/**
 * Shutdown tracing
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    if (process.env.NODE_ENV !== 'production') {
      console.log('OpenTelemetry SDK shut down');
    }
  }
}

// Export OpenTelemetry API for advanced usage
export { trace, context, SpanStatusCode, Span, Tracer, Context };
