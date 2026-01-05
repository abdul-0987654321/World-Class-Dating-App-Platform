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

// Controllers
import { AnalyticsController } from './controllers/analytics.controller';
import { ExecutionController } from './controllers/execution.controller';
import { HealthController } from './controllers/health.controller';
import { WorkflowController } from './controllers/workflow.controller';

// Services
import { WorkflowExecutorService } from './engine/workflow-executor.service';

// Guards
import { InternalServiceGuard } from './guards/internal-service.guard';
import { WorkflowExecution } from './models/workflow-execution.entity';
import { Workflow } from './models/workflow.entity';
import { RabbitMQService } from './queues/rabbitmq.service';
import { RetryService } from './services/retry.service';

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

    // Task scheduling
    ScheduleModule.forRoot(),
  ],
  controllers: [WorkflowController, ExecutionController, AnalyticsController, HealthController],
  providers: [
    // Core services
    WorkflowExecutorService,
    ConditionEvaluatorService,
    ActionExecutorService,
    RetryService,
    RabbitMQService,

    // Guards
    InternalServiceGuard,
  ],
})
export class AppModule {}
