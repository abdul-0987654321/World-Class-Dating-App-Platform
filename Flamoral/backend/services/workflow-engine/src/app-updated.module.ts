import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { getDatabaseConfig } from './config/database.config';

// Entities
import { Workflow } from './models/workflow-updated.entity';
import { WorkflowExecution } from './models/workflow-execution.entity';

// Controllers
import { WorkflowController } from './controllers/workflow.controller';
import { ExecutionController } from './controllers/execution.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { HealthController } from './controllers/health.controller';

// Core Services
import { WorkflowExecutorService } from './engine/workflow-executor.service';
import { ConditionEvaluatorService } from './conditions/condition-evaluator.service';
import { ActionExecutorService } from './actions/action-executor.service';

// Business Services
import { WorkflowService } from './services/workflow.service';
import { AnalyticsService } from './services/analytics.service';
import { ABTestingService } from './services/ab-testing.service';
import { RetryService } from './services/retry.service';
import { RedisCacheService } from './services/redis-cache.service';

// Infrastructure Services
import { RabbitMQService } from './queues/rabbitmq.service';

// Guards
import { InternalServiceGuard } from './guards/internal-service.guard';

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
  controllers: [
    WorkflowController,
    ExecutionController,
    AnalyticsController,
    HealthController,
  ],
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
