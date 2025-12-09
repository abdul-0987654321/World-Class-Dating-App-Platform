import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from '../models/workflow.entity';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { UpdateWorkflowDto } from '../dto/update-workflow.dto';
import { WorkflowStatus } from '../interfaces/workflow.interface';
import { InternalServiceGuard } from '../guards/internal-service.guard';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(InternalServiceGuard)
@ApiBearerAuth('JWT-auth')
export class WorkflowController {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createWorkflowDto: CreateWorkflowDto) {
    const workflow = this.workflowRepository.create(createWorkflowDto);
    return this.workflowRepository.save(workflow);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workflows' })
  @ApiQuery({ name: 'status', required: false, enum: WorkflowStatus })
  @ApiQuery({ name: 'tag', required: false, type: String })
  async findAll(
    @Query('status') status?: WorkflowStatus,
    @Query('tag') tag?: string,
  ) {
    const queryBuilder = this.workflowRepository.createQueryBuilder('workflow');

    if (status) {
      queryBuilder.andWhere('workflow.status = :status', { status });
    }

    if (tag) {
      queryBuilder.andWhere(':tag = ANY(workflow.tags)', { tag });
    }

    queryBuilder.orderBy('workflow.priority', 'DESC');
    queryBuilder.addOrderBy('workflow.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow by ID' })
  async findOne(@Param('id') id: string) {
    return this.workflowRepository.findOne({ where: { id } });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  async update(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ) {
    await this.workflowRepository.update(id, updateWorkflowDto);
    return this.workflowRepository.findOne({ where: { id } });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update workflow status' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: WorkflowStatus,
  ) {
    await this.workflowRepository.update(id, { status });
    return this.workflowRepository.findOne({ where: { id } });
  }

  @Patch(':id/enable')
  @ApiOperation({ summary: 'Enable a workflow' })
  @HttpCode(HttpStatus.OK)
  async enable(@Param('id') id: string) {
    await this.workflowRepository.update(id, { status: WorkflowStatus.ACTIVE });
    return { message: 'Workflow enabled successfully' };
  }

  @Patch(':id/disable')
  @ApiOperation({ summary: 'Disable a workflow' })
  @HttpCode(HttpStatus.OK)
  async disable(@Param('id') id: string) {
    await this.workflowRepository.update(id, { status: WorkflowStatus.PAUSED });
    return { message: 'Workflow disabled successfully' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workflow' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.workflowRepository.delete(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get workflow execution statistics' })
  async getStatistics(@Param('id') id: string) {
    const workflow = await this.workflowRepository.findOne({ where: { id } });

    if (!workflow) {
      return null;
    }

    const successRate =
      workflow.executionCount > 0
        ? (workflow.successCount / workflow.executionCount) * 100
        : 0;

    return {
      workflowId: workflow.id,
      name: workflow.name,
      executionCount: workflow.executionCount,
      successCount: workflow.successCount,
      failureCount: workflow.failureCount,
      successRate: successRate.toFixed(2),
      lastExecutedAt: workflow.lastExecutedAt,
    };
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a workflow' })
  @HttpCode(HttpStatus.CREATED)
  async duplicate(@Param('id') id: string) {
    const original = await this.workflowRepository.findOne({ where: { id } });

    if (!original) {
      return null;
    }

    const duplicate = this.workflowRepository.create({
      ...original,
      id: undefined,
      name: `${original.name} (Copy)`,
      status: WorkflowStatus.DRAFT,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      lastExecutedAt: null,
    });

    return this.workflowRepository.save(duplicate);
  }
}
