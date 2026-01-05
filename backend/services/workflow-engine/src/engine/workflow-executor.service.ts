import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ActionExecutorService } from '../actions/action-executor.service';
import { ConditionEvaluatorService } from '../conditions/condition-evaluator.service';
import {
  ExecutionContext,
  ExecutionStatus,
  TriggerType,
  WorkflowStatus,
} from '../interfaces/workflow.interface';
import { WorkflowExecution } from '../models/workflow-execution.entity';
import { Workflow } from '../models/workflow.entity';
import { RetryService } from '../services/retry.service';

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly actionExecutor: ActionExecutorService,
    private readonly retryService: RetryService
  ) {}

  /**
   * Find and execute workflows for a given trigger
   */
  async triggerWorkflows(
    triggerType: TriggerType,
    triggerData: Record<string, any>,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<string[]> {
    const executionIds: string[] = [];

    try {
      // Find all active workflows with this trigger type
      const workflows = await this.workflowRepository.find({
        where: {
          status: WorkflowStatus.ACTIVE,
        },
        order: {
          priority: 'DESC',
        },
      });

      const matchingWorkflows = workflows.filter((w) => w.trigger.type === triggerType);

      this.logger.log(`Found ${matchingWorkflows.length} workflows for trigger ${triggerType}`);

      // Execute each matching workflow
      for (const workflow of matchingWorkflows) {
        try {
          const executionId = await this.executeWorkflow(workflow, triggerData, userId, metadata);
          executionIds.push(executionId);
        } catch (error) {
          this.logger.error(`Failed to execute workflow ${workflow.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to trigger workflows: ${error.message}`);
    }

    return executionIds;
  }

  /**
   * Execute a single workflow
   */
  async executeWorkflow(
    workflow: Workflow,
    triggerData: Record<string, any>,
    userId?: string,
    metadata?: Record<string, any>,
    attempt: number = 0
  ): Promise<string> {
    const executionId = uuidv4();
    const startTime = new Date();

    // Create execution record
    const execution = this.executionRepository.create({
      id: executionId,
      workflowId: workflow.id,
      userId,
      status: ExecutionStatus.RUNNING,
      triggerData,
      metadata,
      startTime,
      attempt,
    });

    await this.executionRepository.save(execution);

    this.logger.log(`Starting execution ${executionId} for workflow ${workflow.id}`);

    try {
      // Create execution context
      const context: ExecutionContext = {
        workflowId: workflow.id,
        executionId,
        userId,
        triggerData,
        metadata,
        startTime,
        attempt,
      };

      // Evaluate conditions if present
      let conditionsEvaluated = true;
      let conditionResults: Record<string, boolean> = {};

      if (workflow.conditions && workflow.conditions.length > 0) {
        const evaluation = await this.conditionEvaluator.evaluateConditions(
          workflow.conditions,
          context
        );
        conditionsEvaluated = evaluation.passed;
        conditionResults = evaluation.results;

        this.logger.log(`Conditions evaluated: ${conditionsEvaluated} for workflow ${workflow.id}`);

        // Update execution with condition results
        execution.conditionsEvaluated = conditionsEvaluated;
        execution.conditionResults = conditionResults;
        await this.executionRepository.save(execution);
      }

      // Execute actions only if conditions pass
      let actionsExecuted = [];
      if (conditionsEvaluated) {
        actionsExecuted = await this.actionExecutor.executeActions(workflow.actions, context);
      } else {
        this.logger.log(`Skipping actions for workflow ${workflow.id} - conditions not met`);
      }

      // Mark execution as completed
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      execution.status = ExecutionStatus.COMPLETED;
      execution.endTime = endTime;
      execution.duration = duration;
      execution.actionsExecuted = actionsExecuted;

      await this.executionRepository.save(execution);

      // Update workflow statistics
      await this.updateWorkflowStats(workflow.id, true);

      this.logger.log(
        `Completed execution ${executionId} for workflow ${workflow.id} in ${duration}ms`
      );

      return executionId;
    } catch (error) {
      this.logger.error(`Execution ${executionId} failed: ${error.message}`, error.stack);

      // Check if we should retry
      const shouldRetry = await this.retryService.shouldRetry(attempt);

      if (shouldRetry) {
        execution.status = ExecutionStatus.RETRYING;
        execution.retryCount = attempt + 1;
        await this.executionRepository.save(execution);

        // Schedule retry with exponential backoff
        const retryDelay = this.retryService.getRetryDelay(attempt);
        setTimeout(() => {
          this.executeWorkflow(workflow, triggerData, userId, metadata, attempt + 1);
        }, retryDelay);
      } else {
        // Mark as failed
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        execution.status = ExecutionStatus.FAILED;
        execution.endTime = endTime;
        execution.duration = duration;
        execution.error = error.message;
        execution.retryCount = attempt;

        await this.executionRepository.save(execution);

        // Update workflow statistics
        await this.updateWorkflowStats(workflow.id, false);
      }

      throw error;
    }
  }

  /**
   * Update workflow statistics
   */
  private async updateWorkflowStats(workflowId: string, success: boolean): Promise<void> {
    try {
      const workflow = await this.workflowRepository.findOne({
        where: { id: workflowId },
      });

      if (workflow) {
        workflow.executionCount += 1;
        if (success) {
          workflow.successCount += 1;
        } else {
          workflow.failureCount += 1;
        }
        workflow.lastExecutedAt = new Date();

        await this.workflowRepository.save(workflow);
      }
    } catch (error) {
      this.logger.error(`Failed to update workflow stats: ${error.message}`);
    }
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<WorkflowExecution> {
    return this.executionRepository.findOne({
      where: { id: executionId },
      relations: ['workflow'],
    });
  }

  /**
   * Get executions for a workflow
   */
  async getWorkflowExecutions(
    workflowId: string,
    limit: number = 50
  ): Promise<WorkflowExecution[]> {
    return this.executionRepository.find({
      where: { workflowId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const execution = await this.executionRepository.findOne({
      where: { id: executionId },
    });

    if (execution && execution.status === ExecutionStatus.RUNNING) {
      execution.status = ExecutionStatus.CANCELLED;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      await this.executionRepository.save(execution);
    }
  }
}
