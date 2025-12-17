import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from '../models/workflow.entity';
import { WorkflowExecution } from '../models/workflow-execution.entity';
import { WorkflowStatus, ExecutionStatus } from '../interfaces/workflow.interface';

export interface ABTestVariant {
  workflowId: string;
  variant: string;
  percentage: number;
}

export interface ABTestResults {
  testName: string;
  variants: Array<{
    variant: string;
    workflowId: string;
    workflowName: string;
    executions: number;
    successRate: number;
    avgExecutionTime: number;
    conversionRate: number;
  }>;
  winner?: string;
  winnerConfidence?: number;
}

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);

  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
  ) {}

  /**
   * Select a workflow variant for A/B testing
   */
  selectVariant(workflows: Workflow[], userId: string): Workflow {
    if (workflows.length === 0) {
      return null;
    }

    if (workflows.length === 1) {
      return workflows[0];
    }

    // Filter active workflows with A/B test configuration
    const testWorkflows = workflows.filter(
      (w) => w.status === WorkflowStatus.ACTIVE && w.abTestVariant && w.abTestPercentage
    );

    if (testWorkflows.length === 0) {
      // No A/B test configured, return highest priority
      return workflows.sort((a, b) => b.priority - a.priority)[0];
    }

    // Use user ID to deterministically assign variant (consistent assignment)
    const userHash = this.hashUserId(userId);
    const normalizedHash = userHash % 100; // 0-99

    let cumulativePercentage = 0;
    for (const workflow of testWorkflows) {
      cumulativePercentage += workflow.abTestPercentage;
      if (normalizedHash < cumulativePercentage) {
        this.logger.log(
          `Selected variant ${workflow.abTestVariant} for user ${userId} (hash: ${normalizedHash})`,
        );
        return workflow;
      }
    }

    // Fallback to first workflow
    return testWorkflows[0];
  }

  /**
   * Get A/B test results for workflows with the same test group
   */
  async getTestResults(
    testGroup: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ABTestResults> {
    const workflows = await this.workflowRepository.find({
      where: {
        abTestGroup: testGroup,
      },
    });

    if (workflows.length === 0) {
      throw new Error(`No workflows found for test group: ${testGroup}`);
    }

    const variantResults = [];

    for (const workflow of workflows) {
      const executions = await this.executionRepository
        .createQueryBuilder('execution')
        .where('execution.workflowId = :workflowId', { workflowId: workflow.id })
        .andWhere('execution.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .getMany();

      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(
        (e) => e.status === ExecutionStatus.COMPLETED,
      ).length;
      const successRate =
        totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

      const completedExecutions = executions.filter((e) => e.duration !== null);
      const avgExecutionTime =
        completedExecutions.length > 0
          ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
            completedExecutions.length
          : 0;

      // Calculate conversion rate (conditions passed AND actions completed)
      const conversions = executions.filter(
        (e) =>
          e.conditionsEvaluated &&
          e.status === ExecutionStatus.COMPLETED,
      ).length;
      const uniqueUsers = new Set(executions.map((e) => e.userId).filter(Boolean)).size;
      const conversionRate = uniqueUsers > 0 ? (conversions / uniqueUsers) * 100 : 0;

      variantResults.push({
        variant: workflow.abTestVariant,
        workflowId: workflow.id,
        workflowName: workflow.name,
        executions: totalExecutions,
        successRate: parseFloat(successRate.toFixed(2)),
        avgExecutionTime: parseFloat(avgExecutionTime.toFixed(2)),
        conversionRate: parseFloat(conversionRate.toFixed(2)),
      });
    }

    // Sort by conversion rate to determine winner
    variantResults.sort((a, b) => b.conversionRate - a.conversionRate);

    const winner = variantResults.length > 0 ? variantResults[0].variant : null;
    const winnerConfidence = this.calculateConfidence(variantResults);

    return {
      testName: testGroup,
      variants: variantResults,
      winner,
      winnerConfidence,
    };
  }

  /**
   * Create A/B test variants
   */
  async createTestVariants(
    baseWorkflowId: string,
    testGroup: string,
    variants: Array<{ variant: string; percentage: number; modifications: any }>,
  ): Promise<Workflow[]> {
    const baseWorkflow = await this.workflowRepository.findOne({
      where: { id: baseWorkflowId },
    });

    if (!baseWorkflow) {
      throw new Error('Base workflow not found');
    }

    // Validate percentages sum to 100
    const totalPercentage = variants.reduce((sum, v) => sum + v.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Variant percentages must sum to 100');
    }

    const createdVariants: Workflow[] = [];

    for (const variant of variants) {
      const variantWorkflow = this.workflowRepository.create({
        name: `${baseWorkflow.name} - ${variant.variant}`,
        description: baseWorkflow.description,
        trigger: baseWorkflow.trigger,
        conditions: baseWorkflow.conditions,
        actions: baseWorkflow.actions,
        priority: baseWorkflow.priority,
        tags: baseWorkflow.tags,
        createdBy: baseWorkflow.createdBy,
        abTestGroup: testGroup,
        abTestVariant: variant.variant,
        abTestPercentage: variant.percentage,
        ...variant.modifications,
        status: WorkflowStatus.DRAFT,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
      }) as unknown as Workflow;

      const savedVariant = await this.workflowRepository.save(variantWorkflow);
      createdVariants.push(savedVariant);
    }

    this.logger.log(`Created ${createdVariants.length} A/B test variants for group ${testGroup}`);

    return createdVariants;
  }

  /**
   * Activate A/B test (activate all variants)
   */
  async activateTest(testGroup: string): Promise<void> {
    const workflows = await this.workflowRepository.find({
      where: { abTestGroup: testGroup },
    });

    for (const workflow of workflows) {
      workflow.status = WorkflowStatus.ACTIVE;
      await this.workflowRepository.save(workflow);
    }

    this.logger.log(`Activated A/B test group: ${testGroup}`);
  }

  /**
   * End A/B test and select winner
   */
  async endTest(testGroup: string, winnerId: string): Promise<void> {
    const workflows = await this.workflowRepository.find({
      where: { abTestGroup: testGroup },
    });

    for (const workflow of workflows) {
      if (workflow.id === winnerId) {
        // Keep winner active
        workflow.status = WorkflowStatus.ACTIVE;
        workflow.abTestGroup = null;
        workflow.abTestVariant = null;
        workflow.abTestPercentage = null;
      } else {
        // Archive losers
        workflow.status = WorkflowStatus.ARCHIVED;
      }
      await this.workflowRepository.save(workflow);
    }

    this.logger.log(`Ended A/B test group ${testGroup}, winner: ${winnerId}`);
  }

  /**
   * Hash user ID for consistent variant assignment
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calculate statistical confidence for test winner
   * Simplified z-test for proportions
   */
  private calculateConfidence(variants: any[]): number {
    if (variants.length < 2) {
      return 0;
    }

    const [winner, runnerUp] = variants.slice(0, 2);

    if (winner.executions === 0 || runnerUp.executions === 0) {
      return 0;
    }

    const p1 = winner.conversionRate / 100;
    const p2 = runnerUp.conversionRate / 100;
    const n1 = winner.executions;
    const n2 = runnerUp.executions;

    // Pooled proportion
    const p = (p1 * n1 + p2 * n2) / (n1 + n2);

    // Standard error
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));

    if (se === 0) {
      return 0;
    }

    // Z-score
    const z = Math.abs(p1 - p2) / se;

    // Convert z-score to confidence (approximation)
    // z > 1.96 = 95% confidence, z > 2.58 = 99% confidence
    let confidence = 0;
    if (z > 2.58) {
      confidence = 99;
    } else if (z > 1.96) {
      confidence = 95;
    } else if (z > 1.64) {
      confidence = 90;
    } else if (z > 1.28) {
      confidence = 80;
    } else {
      confidence = Math.min(Math.round((z / 1.96) * 95), 79);
    }

    return confidence;
  }
}
