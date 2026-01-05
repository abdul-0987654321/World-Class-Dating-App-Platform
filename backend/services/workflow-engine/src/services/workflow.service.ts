import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { UpdateWorkflowDto } from '../dto/update-workflow.dto';
import { WorkflowStatus } from '../interfaces/workflow.interface';
import { Workflow } from '../models/workflow.entity';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>
  ) {}

  /**
   * Create a new workflow
   */
  async create(createWorkflowDto: CreateWorkflowDto, createdBy: string): Promise<Workflow> {
    try {
      const workflow = this.workflowRepository.create({
        ...createWorkflowDto,
        createdBy,
        status: WorkflowStatus.DRAFT,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
      });

      const savedWorkflow = await this.workflowRepository.save(workflow);
      this.logger.log(`Created workflow: ${savedWorkflow.id}`);

      return savedWorkflow;
    } catch (error) {
      this.logger.error(`Failed to create workflow: ${error.message}`);
      throw new BadRequestException('Failed to create workflow');
    }
  }

  /**
   * Get all workflows with optional filters
   */
  async findAll(filters?: {
    status?: WorkflowStatus;
    tags?: string[];
    createdBy?: string;
  }): Promise<Workflow[]> {
    const query = this.workflowRepository.createQueryBuilder('workflow');

    if (filters?.status) {
      query.andWhere('workflow.status = :status', { status: filters.status });
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.andWhere('workflow.tags && :tags', { tags: filters.tags });
    }

    if (filters?.createdBy) {
      query.andWhere('workflow.createdBy = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    return query.orderBy('workflow.createdAt', 'DESC').getMany();
  }

  /**
   * Get a workflow by ID
   */
  async findOne(id: string): Promise<Workflow> {
    const workflow = await this.workflowRepository.findOne({
      where: { id },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  /**
   * Update a workflow
   */
  async update(id: string, updateWorkflowDto: UpdateWorkflowDto): Promise<Workflow> {
    const workflow = await this.findOne(id);

    // Don't allow updating active workflows without explicit pause
    if (
      workflow.status === WorkflowStatus.ACTIVE &&
      updateWorkflowDto.status !== WorkflowStatus.PAUSED
    ) {
      throw new BadRequestException('Cannot update active workflow. Pause it first.');
    }

    Object.assign(workflow, updateWorkflowDto);
    workflow.updatedAt = new Date();

    const updatedWorkflow = await this.workflowRepository.save(workflow);
    this.logger.log(`Updated workflow: ${id}`);

    return updatedWorkflow;
  }

  /**
   * Delete a workflow
   */
  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);

    // Don't allow deleting active workflows
    if (workflow.status === WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active workflow. Pause or archive it first.');
    }

    await this.workflowRepository.remove(workflow);
    this.logger.log(`Deleted workflow: ${id}`);
  }

  /**
   * Activate a workflow
   */
  async activate(id: string): Promise<Workflow> {
    const workflow = await this.findOne(id);

    // Validate workflow has required components
    if (!workflow.trigger || !workflow.actions || workflow.actions.length === 0) {
      throw new BadRequestException('Workflow must have a trigger and at least one action');
    }

    workflow.status = WorkflowStatus.ACTIVE;
    workflow.updatedAt = new Date();

    const activatedWorkflow = await this.workflowRepository.save(workflow);
    this.logger.log(`Activated workflow: ${id}`);

    return activatedWorkflow;
  }

  /**
   * Pause a workflow
   */
  async pause(id: string): Promise<Workflow> {
    const workflow = await this.findOne(id);

    workflow.status = WorkflowStatus.PAUSED;
    workflow.updatedAt = new Date();

    const pausedWorkflow = await this.workflowRepository.save(workflow);
    this.logger.log(`Paused workflow: ${id}`);

    return pausedWorkflow;
  }

  /**
   * Archive a workflow
   */
  async archive(id: string): Promise<Workflow> {
    const workflow = await this.findOne(id);

    workflow.status = WorkflowStatus.ARCHIVED;
    workflow.updatedAt = new Date();

    const archivedWorkflow = await this.workflowRepository.save(workflow);
    this.logger.log(`Archived workflow: ${id}`);

    return archivedWorkflow;
  }

  /**
   * Get workflow statistics
   */
  async getStats(id: string): Promise<{
    executionCount: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    avgExecutionTime?: number;
  }> {
    const workflow = await this.findOne(id);

    const successRate =
      workflow.executionCount > 0 ? (workflow.successCount / workflow.executionCount) * 100 : 0;

    return {
      executionCount: workflow.executionCount,
      successCount: workflow.successCount,
      failureCount: workflow.failureCount,
      successRate: parseFloat(successRate.toFixed(2)),
    };
  }

  /**
   * Clone a workflow
   */
  async clone(id: string, newName: string, createdBy: string): Promise<Workflow> {
    const sourceWorkflow = await this.findOne(id);

    const clonedWorkflow = this.workflowRepository.create({
      name: newName,
      description: sourceWorkflow.description,
      trigger: sourceWorkflow.trigger,
      conditions: sourceWorkflow.conditions,
      actions: sourceWorkflow.actions,
      priority: sourceWorkflow.priority,
      tags: sourceWorkflow.tags,
      abTestVariant: sourceWorkflow.abTestVariant,
      abTestPercentage: sourceWorkflow.abTestPercentage,
      createdBy,
      status: WorkflowStatus.DRAFT,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
    });

    const savedWorkflow = await this.workflowRepository.save(clonedWorkflow);
    this.logger.log(`Cloned workflow ${id} to ${savedWorkflow.id}`);

    return savedWorkflow;
  }

  /**
   * Get workflows by trigger type
   */
  async findByTriggerType(triggerType: string): Promise<Workflow[]> {
    const workflows = await this.workflowRepository
      .createQueryBuilder('workflow')
      .where('workflow.status = :status', { status: WorkflowStatus.ACTIVE })
      .andWhere("workflow.trigger->>'type' = :triggerType", { triggerType })
      .orderBy('workflow.priority', 'DESC')
      .getMany();

    return workflows;
  }
}
