import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { InternalServiceGuard } from '../guards/internal-service.guard';
import { ExecutionStatus } from '../interfaces/workflow.interface';
import { WorkflowExecution } from '../models/workflow-execution.entity';
import { Workflow } from '../models/workflow.entity';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(InternalServiceGuard)
@ApiBearerAuth('JWT-auth')
export class AnalyticsController {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>
  ) {}

  @Get('workflows/performance')
  @ApiOperation({ summary: 'Get workflow performance metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getWorkflowPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const workflows = await this.workflowRepository.find();

    const performanceData = await Promise.all(
      workflows.map(async (workflow) => {
        const queryBuilder = this.executionRepository
          .createQueryBuilder('execution')
          .where('execution.workflowId = :workflowId', {
            workflowId: workflow.id,
          });

        if (startDate && endDate) {
          queryBuilder.andWhere({
            createdAt: Between(new Date(startDate), new Date(endDate)),
          });
        }

        const executions = await queryBuilder.getCount();
        const successful = await queryBuilder
          .andWhere('execution.status = :status', {
            status: ExecutionStatus.COMPLETED,
          })
          .getCount();
        const failed = await this.executionRepository.count({
          where: {
            workflowId: workflow.id,
            status: ExecutionStatus.FAILED,
          },
        });

        const avgDuration = await this.executionRepository
          .createQueryBuilder('execution')
          .select('AVG(execution.duration)', 'avg')
          .where('execution.workflowId = :workflowId', {
            workflowId: workflow.id,
          })
          .andWhere('execution.duration IS NOT NULL')
          .getRawOne();

        const successRate = executions > 0 ? (successful / executions) * 100 : 0;

        return {
          workflowId: workflow.id,
          name: workflow.name,
          executions,
          successful,
          failed,
          successRate: successRate.toFixed(2),
          averageDuration: avgDuration?.avg || 0,
          lastExecutedAt: workflow.lastExecutedAt,
        };
      })
    );

    return performanceData.sort((a, b) => b.executions - a.executions);
  }

  @Get('workflows/:id/timeline')
  @ApiOperation({ summary: 'Get workflow execution timeline' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'interval', required: false, enum: ['hour', 'day', 'week', 'month'] })
  async getExecutionTimeline(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('interval') interval: 'hour' | 'day' | 'week' | 'month' = 'day'
  ) {
    const queryBuilder = this.executionRepository
      .createQueryBuilder('execution')
      .where('execution.workflowId = :workflowId', { workflowId: id });

    if (startDate && endDate) {
      queryBuilder.andWhere({
        createdAt: Between(new Date(startDate), new Date(endDate)),
      });
    }

    const executions = await queryBuilder.orderBy('execution.createdAt', 'ASC').getMany();

    // Group by interval
    const timeline = this.groupByInterval(executions, interval);

    return timeline;
  }

  @Get('triggers/popularity')
  @ApiOperation({ summary: 'Get trigger type popularity' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getTriggerPopularity(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const workflows = await this.workflowRepository.find();

    const triggerStats = new Map<string, { count: number; executions: number }>();

    for (const workflow of workflows) {
      const triggerType = workflow.trigger.type;

      const queryBuilder = this.executionRepository
        .createQueryBuilder('execution')
        .where('execution.workflowId = :workflowId', { workflowId: workflow.id });

      if (startDate && endDate) {
        queryBuilder.andWhere({
          createdAt: Between(new Date(startDate), new Date(endDate)),
        });
      }

      const executionCount = await queryBuilder.getCount();

      const existing = triggerStats.get(triggerType) || { count: 0, executions: 0 };
      triggerStats.set(triggerType, {
        count: existing.count + 1,
        executions: existing.executions + executionCount,
      });
    }

    return Array.from(triggerStats.entries()).map(([triggerType, stats]) => ({
      triggerType,
      workflowCount: stats.count,
      executionCount: stats.executions,
    }));
  }

  @Get('actions/usage')
  @ApiOperation({ summary: 'Get action type usage statistics' })
  async getActionUsage() {
    const workflows = await this.workflowRepository.find();

    const actionStats = new Map<string, number>();

    for (const workflow of workflows) {
      for (const action of workflow.actions) {
        const count = actionStats.get(action.type) || 0;
        actionStats.set(action.type, count + 1);
      }
    }

    return Array.from(actionStats.entries())
      .map(([actionType, count]) => ({
        actionType,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview' })
  async getDashboard() {
    const totalWorkflows = await this.workflowRepository.count();
    const activeWorkflows = await this.workflowRepository.count({
      where: { status: 'active' as any },
    });
    const totalExecutions = await this.executionRepository.count();

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentExecutions = await this.executionRepository.count({
      where: {
        createdAt: Between(last24Hours, new Date()),
      },
    });

    const successfulExecutions = await this.executionRepository.count({
      where: { status: ExecutionStatus.COMPLETED },
    });

    const failedExecutions = await this.executionRepository.count({
      where: { status: ExecutionStatus.FAILED },
    });

    const successRate =
      totalExecutions > 0 ? ((successfulExecutions / totalExecutions) * 100).toFixed(2) : '0';

    const topWorkflows = await this.workflowRepository.find({
      order: { executionCount: 'DESC' },
      take: 5,
    });

    return {
      totalWorkflows,
      activeWorkflows,
      totalExecutions,
      recentExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      topWorkflows: topWorkflows.map((w) => ({
        id: w.id,
        name: w.name,
        executions: w.executionCount,
      })),
    };
  }

  /**
   * Helper method to group executions by time interval
   */
  private groupByInterval(
    executions: WorkflowExecution[],
    interval: 'hour' | 'day' | 'week' | 'month'
  ) {
    const groups = new Map<string, any>();

    for (const execution of executions) {
      let key: string;
      const date = new Date(execution.createdAt);

      switch (interval) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          break;
        case 'week': {
          const weekNum = this.getWeekNumber(date);
          key = `${date.getFullYear()}-W${weekNum}`;
          break;
        }
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
      }

      if (!groups.has(key)) {
        groups.set(key, {
          period: key,
          total: 0,
          successful: 0,
          failed: 0,
        });
      }

      const group = groups.get(key);
      group.total++;
      if (execution.status === ExecutionStatus.COMPLETED) {
        group.successful++;
      } else if (execution.status === ExecutionStatus.FAILED) {
        group.failed++;
      }
    }

    return Array.from(groups.values());
  }

  /**
   * Helper method to get week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
