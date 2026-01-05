import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActionExecutorService } from './actions/action-executor.service';
import { ConditionEvaluatorService } from './conditions/condition-evaluator.service';
import configuration from './config/configuration';
import { getDatabaseConfig } from './config/database.config';

// Entities
import { AnalyticsController } from './controllers/analytics.controller';
import { ExecutionController } from './controllers/execution.controller';
import { HealthController } from './controllers/health.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { WorkflowExecutorService } from './engine/workflow-executor.service';
import { InternalServiceGuard } from './guards/internal-service.guard';
import { WorkflowExecution } from './models/workflow-execution.entity';
import { Workflow } from './models/workflow-updated.entity';

// Controllers

// Core Services

// Business Services
import { RabbitMQService } from './queues/rabbitmq.service';
import { ABTestingService } from './services/ab-testing.service';
import { AnalyticsService } from './services/analytics.service';
import { RedisCacheService } from './services/redis-cache.service';
import { RetryService } from './services/retry.service';
import { WorkflowService } from './services/workflow.service';

// Infrastructure Services

// Guards

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    TypeOrmModule.forFeature([Workflow, WorkflowExecution]),

    // Health checks
    TerminusModule,

    // Task scheduling for cron workflows
    ScheduleModule.forRoot(),
  ],
  controllers: [WorkflowController, ExecutionController, AnalyticsController, HealthController],
  providers: [
    // Core Workflow Engine
    WorkflowExecutorService,
    ConditionEvaluatorService,
    ActionExecutorService,

    // Business Logic Services
    WorkflowService,
    AnalyticsService,
    ABTestingService,
    RetryService,

    // Infrastructure Services
    RedisCacheService,
    RabbitMQService,

    // Guards
    InternalServiceGuard,
  ],
  exports: [
    WorkflowService,
    WorkflowExecutorService,
    AnalyticsService,
    ABTestingService,
    RedisCacheService,
    RabbitMQService,
  ],
})
export class AppModule {}
