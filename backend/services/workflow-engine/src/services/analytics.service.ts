import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WorkflowExecution } from '../models/workflow-execution.entity';
import { Workflow } from '../models/workflow.entity';
import { ExecutionStatus, TriggerType } from '../interfaces/workflow.interface';

export interface AnalyticsReport {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  executionsByStatus: Record<string, number>;
  executionsByTrigger: Record<string, number>;
  executionsByDay: Array<{ date: string; count: number }>;
  topWorkflows: Array<{
    workflowId: string;
    workflowName: string;
    executions: number;
    successRate: number;
  }>;
}

export interface FunnelMetrics {
  trigger: string;
  totalUsers: number;
  conditionsPassed: number;
  conditionsPassedRate: number;
  actionsCompleted: number;
  actionsCompletedRate: number;
  conversionRate: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
  ) {}

  /**
   * Get analytics report for a date range
   */
  async getReport(startDate: Date, endDate: Date): Promise<AnalyticsReport> {
    const executions = await this.executionRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      relations: ['workflow'],
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.COMPLETED,
    ).length;
    const failedExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.FAILED,
    ).length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    // Calculate average execution time
    const completedExecutions = executions.filter((e) => e.duration !== null);
    const avgExecutionTime =
      completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
          completedExecutions.length
        : 0;

    // Executions by status
    const executionsByStatus: Record<string, number> = {};
    for (const status of Object.values(ExecutionStatus)) {
      executionsByStatus[status] = executions.filter((e) => e.status === status).length;
    }

    // Executions by trigger
    const executionsByTrigger: Record<string, number> = {};
    for (const execution of executions) {
      if (execution.workflow?.trigger?.type) {
        const trigger = execution.workflow.trigger.type;
        executionsByTrigger[trigger] = (executionsByTrigger[trigger] || 0) + 1;
      }
    }

    // Executions by day
    const executionsByDay = this.groupExecutionsByDay(executions, startDate, endDate);

    // Top workflows
    const topWorkflows = await this.getTopWorkflows(startDate, endDate, 10);

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: parseFloat(successRate.toFixed(2)),
      avgExecutionTime: parseFloat(avgExecutionTime.toFixed(2)),
      executionsByStatus,
      executionsByTrigger,
      executionsByDay,
      topWorkflows,
    };
  }

  /**
   * Get funnel metrics for a specific workflow
   */
  async getFunnelMetrics(workflowId: string, startDate: Date, endDate: Date): Promise<FunnelMetrics> {
    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const executions = await this.executionRepository.find({
      where: {
        workflowId,
        createdAt: Between(startDate, endDate),
      },
    });

    const totalUsers = new Set(executions.map((e) => e.userId).filter(Boolean)).size;
    const conditionsPassed = executions.filter((e) => e.conditionsEvaluated).length;
    const actionsCompleted = executions.filter((e) => e.status === ExecutionStatus.COMPLETED).length;

    const conditionsPassedRate = totalUsers > 0 ? (conditionsPassed / totalUsers) * 100 : 0;
    const actionsCompletedRate = conditionsPassed > 0 ? (actionsCompleted / conditionsPassed) * 100 : 0;
    const conversionRate = totalUsers > 0 ? (actionsCompleted / totalUsers) * 100 : 0;

    return {
      trigger: workflow.trigger.type,
      totalUsers,
      conditionsPassed,
      conditionsPassedRate: parseFloat(conditionsPassedRate.toFixed(2)),
      actionsCompleted,
      actionsCompletedRate: parseFloat(actionsCompletedRate.toFixed(2)),
      conversionRate: parseFloat(conversionRate.toFixed(2)),
    };
  }

  /**
   * Get workflow performance metrics
   */
  async getWorkflowPerformance(workflowId: string): Promise<{
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    recentExecutions: Array<{
      executionId: string;
      status: string;
      duration: number;
      timestamp: Date;
    }>;
  }> {
    const executions = await this.executionRepository.find({
      where: { workflowId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.COMPLETED,
    ).length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    const completedExecutions = executions.filter((e) => e.duration !== null);
    const avgExecutionTime =
      completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
          completedExecutions.length
        : 0;

    const recentExecutions = executions.slice(0, 10).map((e) => ({
      executionId: e.id,
      status: e.status,
      duration: e.duration || 0,
      timestamp: e.createdAt,
    }));

    return {
      totalExecutions,
      successRate: parseFloat(successRate.toFixed(2)),
      avgExecutionTime: parseFloat(avgExecutionTime.toFixed(2)),
      recentExecutions,
    };
  }

  /**
   * Get trigger analytics
   */
  async getTriggerAnalytics(triggerType: TriggerType, startDate: Date, endDate: Date): Promise<{
    totalExecutions: number;
    uniqueUsers: number;
    successRate: number;
    avgExecutionTime: number;
    topWorkflows: Array<{
      workflowId: string;
      workflowName: string;
      executions: number;
    }>;
  }> {
    const workflows = await this.workflowRepository.find({
      where: {
        trigger: {
          type: triggerType,
        } as any,
      },
    });

    const workflowIds = workflows.map((w) => w.id);

    const executions = await this.executionRepository
      .createQueryBuilder('execution')
      .where('execution.workflowId IN (:...workflowIds)', { workflowIds })
      .andWhere('execution.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    const totalExecutions = executions.length;
    const uniqueUsers = new Set(executions.map((e) => e.userId).filter(Boolean)).size;
    const successfulExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.COMPLETED,
    ).length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    const completedExecutions = executions.filter((e) => e.duration !== null);
    const avgExecutionTime =
      completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
          completedExecutions.length
        : 0;

    // Top workflows for this trigger
    const workflowExecutionCounts = new Map<string, number>();
    for (const execution of executions) {
      const count = workflowExecutionCounts.get(execution.workflowId) || 0;
      workflowExecutionCounts.set(execution.workflowId, count + 1);
    }

    const topWorkflows = Array.from(workflowExecutionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([workflowId, executions]) => {
        const workflow = workflows.find((w) => w.id === workflowId);
        return {
          workflowId,
          workflowName: workflow?.name || 'Unknown',
          executions,
        };
      });

    return {
      totalExecutions,
      uniqueUsers,
      successRate: parseFloat(successRate.toFixed(2)),
      avgExecutionTime: parseFloat(avgExecutionTime.toFixed(2)),
      topWorkflows,
    };
  }

  /**
   * Group executions by day
   */
  private groupExecutionsByDay(
    executions: WorkflowExecution[],
    startDate: Date,
    endDate: Date,
  ): Array<{ date: string; count: number }> {
    const dayMap = new Map<string, number>();

    // Initialize all days in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dayMap.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count executions per day
    for (const execution of executions) {
      const dateStr = execution.createdAt.toISOString().split('T')[0];
      dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
    }

    return Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get top performing workflows
   */
  private async getTopWorkflows(
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ): Promise<
    Array<{
      workflowId: string;
      workflowName: string;
      executions: number;
      successRate: number;
    }>
  > {
    const result = await this.executionRepository
      .createQueryBuilder('execution')
      .select('execution.workflowId', 'workflowId')
      .addSelect('COUNT(*)', 'executions')
      .addSelect(
        `SUM(CASE WHEN execution.status = '${ExecutionStatus.COMPLETED}' THEN 1 ELSE 0 END)`,
        'successful',
      )
      .where('execution.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('execution.workflowId')
      .orderBy('executions', 'DESC')
      .limit(limit)
      .getRawMany();

    const workflowIds = result.map((r) => r.workflowId);
    const workflows = await this.workflowRepository.findByIds(workflowIds);

    return result.map((r) => {
      const workflow = workflows.find((w) => w.id === r.workflowId);
      const successRate = (parseInt(r.successful) / parseInt(r.executions)) * 100;

      return {
        workflowId: r.workflowId,
        workflowName: workflow?.name || 'Unknown',
        executions: parseInt(r.executions),
        successRate: parseFloat(successRate.toFixed(2)),
      };
    });
  }
}
