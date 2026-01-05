import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { TriggerWorkflowDto } from '../dto/trigger-workflow.dto';
import { WorkflowExecutorService } from '../engine/workflow-executor.service';
import { InternalServiceGuard } from '../guards/internal-service.guard';
import { ExecutionStatus } from '../interfaces/workflow.interface';
import { WorkflowExecution } from '../models/workflow-execution.entity';

@ApiTags('execution')
@Controller('executions')
@UseGuards(InternalServiceGuard)
@ApiBearerAuth('JWT-auth')
export class ExecutionController {
  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    private readonly workflowExecutor: WorkflowExecutorService
  ) {}

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger workflows for a specific event' })
  @HttpCode(HttpStatus.ACCEPTED)
  async trigger(@Body() triggerDto: TriggerWorkflowDto) {
    const executionIds = await this.workflowExecutor.triggerWorkflows(
      triggerDto.triggerType,
      triggerDto.triggerData,
      triggerDto.userId,
      triggerDto.metadata
    );

    return {
      message: 'Workflows triggered successfully',
      executionIds,
      count: executionIds.length,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all workflow executions' })
  @ApiQuery({ name: 'status', required: false, enum: ExecutionStatus })
  @ApiQuery({ name: 'workflowId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @Query('status') status?: ExecutionStatus,
    @Query('workflowId') workflowId?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0
  ) {
    const queryBuilder = this.executionRepository.createQueryBuilder('execution');

    if (status) {
      queryBuilder.andWhere('execution.status = :status', { status });
    }

    if (workflowId) {
      queryBuilder.andWhere('execution.workflowId = :workflowId', {
        workflowId,
      });
    }

    if (userId) {
      queryBuilder.andWhere('execution.userId = :userId', { userId });
    }

    queryBuilder
      .leftJoinAndSelect('execution.workflow', 'workflow')
      .orderBy('execution.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [executions, total] = await queryBuilder.getManyAndCount();

    return {
      executions,
      total,
      limit,
      offset,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get execution by ID' })
  async findOne(@Param('id') id: string) {
    return this.workflowExecutor.getExecution(id);
  }

  @Get('workflow/:workflowId')
  @ApiOperation({ summary: 'Get executions for a specific workflow' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getWorkflowExecutions(
    @Param('workflowId') workflowId: string,
    @Query('limit') limit: number = 50
  ) {
    return this.workflowExecutor.getWorkflowExecutions(workflowId, limit);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a running execution' })
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string) {
    await this.workflowExecutor.cancelExecution(id);
    return { message: 'Execution cancelled successfully' };
  }

  @Get('statistics/summary')
  @ApiOperation({ summary: 'Get execution statistics summary' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getStatistics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const queryBuilder = this.executionRepository.createQueryBuilder('execution');

    if (startDate && endDate) {
      queryBuilder.where({
        createdAt: Between(new Date(startDate), new Date(endDate)),
      });
    }

    const total = await queryBuilder.getCount();

    const statusCounts = await Promise.all(
      Object.values(ExecutionStatus).map(async (status) => {
        const count = await this.executionRepository.count({
          where: { status },
        });
        return { status, count };
      })
    );

    const avgDuration = await queryBuilder
      .select('AVG(execution.duration)', 'avg')
      .where('execution.duration IS NOT NULL')
      .getRawOne();

    return {
      total,
      statusCounts,
      averageDuration: avgDuration?.avg || 0,
    };
  }
}
