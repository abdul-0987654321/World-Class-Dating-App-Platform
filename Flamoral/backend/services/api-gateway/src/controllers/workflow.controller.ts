import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProxyService } from '../services/proxy.service';

@ApiTags('workflow')
@ApiBearerAuth('JWT-auth')
@Controller('workflow')
export class WorkflowController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Workflow CRUD Endpoints ====================

  /**
   * Get all workflows
   */
  @Get()
  @ApiOperation({ summary: 'Get all workflows' })
  async getAllWorkflows(
    @Headers('authorization') authorization: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const queryString = new URLSearchParams();
    if (page) queryString.append('page', page.toString());
    if (limit) queryString.append('limit', limit.toString());
    if (status) queryString.append('status', status);
    if (category) queryString.append('category', category);

    const path = `/api/workflows${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('workflowService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get workflow by ID
   */
  @Get(':workflowId')
  @ApiOperation({ summary: 'Get workflow by ID' })
  async getWorkflowById(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.proxyService.get('workflowService', `/api/workflows/${workflowId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Create new workflow
   */
  @Post()
  @ApiOperation({ summary: 'Create new workflow' })
  @HttpCode(HttpStatus.CREATED)
  async createWorkflow(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('workflowService', '/api/workflows', body, {
      Authorization: authorization,
    });
  }

  /**
   * Update workflow
   */
  @Put(':workflowId')
  @ApiOperation({ summary: 'Update workflow' })
  async updateWorkflow(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('workflowService', `/api/workflows/${workflowId}`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Patch workflow
   */
  @Patch(':workflowId')
  @ApiOperation({ summary: 'Partially update workflow' })
  async patchWorkflow(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Body() body: any,
  ) {
    return this.proxyService.patch('workflowService', `/api/workflows/${workflowId}`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Delete workflow
   */
  @Delete(':workflowId')
  @ApiOperation({ summary: 'Delete workflow' })
  async deleteWorkflow(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.proxyService.delete('workflowService', `/api/workflows/${workflowId}`, {
      Authorization: authorization,
    });
  }

  // ==================== Workflow Execution Endpoints ====================

  /**
   * Start workflow execution
   */
  @Post(':workflowId/execute')
  @ApiOperation({ summary: 'Start workflow execution' })
  @HttpCode(HttpStatus.CREATED)
  async executeWorkflow(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('workflowService', `/api/workflows/${workflowId}/execute`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Get workflow executions
   */
  @Get(':workflowId/executions')
  @ApiOperation({ summary: 'Get workflow execution history' })
  async getWorkflowExecutions(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const queryString = new URLSearchParams();
    if (page) queryString.append('page', page.toString());
    if (limit) queryString.append('limit', limit.toString());
    if (status) queryString.append('status', status);

    const path = `/api/workflows/${workflowId}/executions${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('workflowService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get specific workflow execution
   */
  @Get(':workflowId/executions/:executionId')
  @ApiOperation({ summary: 'Get specific workflow execution details' })
  async getWorkflowExecution(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.proxyService.get('workflowService', `/api/workflows/${workflowId}/executions/${executionId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Cancel workflow execution
   */
  @Post(':workflowId/executions/:executionId/cancel')
  @ApiOperation({ summary: 'Cancel workflow execution' })
  @HttpCode(HttpStatus.OK)
  async cancelWorkflowExecution(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.proxyService.post('workflowService', `/api/workflows/${workflowId}/executions/${executionId}/cancel`, {}, {
      Authorization: authorization,
    });
  }

  /**
   * Retry workflow execution
   */
  @Post(':workflowId/executions/:executionId/retry')
  @ApiOperation({ summary: 'Retry failed workflow execution' })
  @HttpCode(HttpStatus.OK)
  async retryWorkflowExecution(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.proxyService.post('workflowService', `/api/workflows/${workflowId}/executions/${executionId}/retry`, {}, {
      Authorization: authorization,
    });
  }

  // ==================== Workflow Steps Endpoints ====================

  /**
   * Get workflow steps
   */
  @Get(':workflowId/steps')
  @ApiOperation({ summary: 'Get workflow steps' })
  async getWorkflowSteps(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.proxyService.get('workflowService', `/api/workflows/${workflowId}/steps`, {
      Authorization: authorization,
    });
  }

  /**
   * Add step to workflow
   */
  @Post(':workflowId/steps')
  @ApiOperation({ summary: 'Add step to workflow' })
  @HttpCode(HttpStatus.CREATED)
  async addWorkflowStep(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('workflowService', `/api/workflows/${workflowId}/steps`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Update workflow step
   */
  @Put(':workflowId/steps/:stepId')
  @ApiOperation({ summary: 'Update workflow step' })
  async updateWorkflowStep(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('workflowService', `/api/workflows/${workflowId}/steps/${stepId}`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Delete workflow step
   */
  @Delete(':workflowId/steps/:stepId')
  @ApiOperation({ summary: 'Delete workflow step' })
  async deleteWorkflowStep(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
  ) {
    return this.proxyService.delete('workflowService', `/api/workflows/${workflowId}/steps/${stepId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Reorder workflow steps
   */
  @Put(':workflowId/steps/reorder')
  @ApiOperation({ summary: 'Reorder workflow steps' })
  async reorderWorkflowSteps(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('workflowService', `/api/workflows/${workflowId}/steps/reorder`, body, {
      Authorization: authorization,
    });
  }

  // ==================== Workflow Templates Endpoints ====================

  /**
   * Get workflow templates
   */
  @Get('templates/all')
  @ApiOperation({ summary: 'Get all workflow templates' })
  async getWorkflowTemplates(
    @Headers('authorization') authorization: string,
    @Query('category') category?: string,
  ) {
    const queryString = new URLSearchParams();
    if (category) queryString.append('category', category);

    const path = `/api/workflows/templates/all${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('workflowService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get workflow template by ID
   */
  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get workflow template by ID' })
  async getWorkflowTemplateById(
    @Headers('authorization') authorization: string,
    @Param('templateId') templateId: string,
  ) {
    return this.proxyService.get('workflowService', `/api/workflows/templates/${templateId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Create workflow from template
   */
  @Post('templates/:templateId/create')
  @ApiOperation({ summary: 'Create workflow from template' })
  @HttpCode(HttpStatus.CREATED)
  async createFromTemplate(
    @Headers('authorization') authorization: string,
    @Param('templateId') templateId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('workflowService', `/api/workflows/templates/${templateId}/create`, body, {
      Authorization: authorization,
    });
  }

  // ==================== Workflow Validation Endpoints ====================

  /**
   * Validate workflow
   */
  @Post('validate')
  @ApiOperation({ summary: 'Validate workflow configuration' })
  @HttpCode(HttpStatus.OK)
  async validateWorkflow(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('workflowService', '/api/workflows/validate', body, {
      Authorization: authorization,
    });
  }

  /**
   * Test workflow
   */
  @Post(':workflowId/test')
  @ApiOperation({ summary: 'Test workflow with sample data' })
  @HttpCode(HttpStatus.OK)
  async testWorkflow(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('workflowService', `/api/workflows/${workflowId}/test`, body, {
      Authorization: authorization,
    });
  }

  // ==================== Workflow State Management Endpoints ====================

  /**
   * Activate workflow
   */
  @Post(':workflowId/activate')
  @ApiOperation({ summary: 'Activate workflow' })
  @HttpCode(HttpStatus.OK)
  async activateWorkflow(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.proxyService.post('workflowService', `/api/workflows/${workflowId}/activate`, {}, {
      Authorization: authorization,
    });
  }

  /**
   * Deactivate workflow
   */
  @Post(':workflowId/deactivate')
  @ApiOperation({ summary: 'Deactivate workflow' })
  @HttpCode(HttpStatus.OK)
  async deactivateWorkflow(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.proxyService.post('workflowService', `/api/workflows/${workflowId}/deactivate`, {}, {
      Authorization: authorization,
    });
  }

  /**
   * Pause workflow
   */
  @Post(':workflowId/pause')
  @ApiOperation({ summary: 'Pause workflow' })
  @HttpCode(HttpStatus.OK)
  async pauseWorkflow(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.proxyService.post('workflowService', `/api/workflows/${workflowId}/pause`, {}, {
      Authorization: authorization,
    });
  }

  /**
   * Resume workflow
   */
  @Post(':workflowId/resume')
  @ApiOperation({ summary: 'Resume workflow' })
  @HttpCode(HttpStatus.OK)
  async resumeWorkflow(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.proxyService.post('workflowService', `/api/workflows/${workflowId}/resume`, {}, {
      Authorization: authorization,
    });
  }

  // ==================== Workflow Variables Endpoints ====================

  /**
   * Get workflow variables
   */
  @Get(':workflowId/variables')
  @ApiOperation({ summary: 'Get workflow variables' })
  async getWorkflowVariables(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.proxyService.get('workflowService', `/api/workflows/${workflowId}/variables`, {
      Authorization: authorization,
    });
  }

  /**
   * Update workflow variables
   */
  @Put(':workflowId/variables')
  @ApiOperation({ summary: 'Update workflow variables' })
  async updateWorkflowVariables(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('workflowService', `/api/workflows/${workflowId}/variables`, body, {
      Authorization: authorization,
    });
  }

  // ==================== Workflow Analytics Endpoints ====================

  /**
   * Get workflow statistics
   */
  @Get(':workflowId/statistics')
  @ApiOperation({ summary: 'Get workflow statistics' })
  async getWorkflowStatistics(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/workflows/${workflowId}/statistics${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('workflowService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get workflow performance metrics
   */
  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get workflow performance metrics' })
  async getPerformanceMetrics(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/workflows/analytics/performance${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('workflowService', path, {
      Authorization: authorization,
    });
  }

  // ==================== Workflow Versioning Endpoints ====================

  /**
   * Get workflow versions
   */
  @Get(':workflowId/versions')
  @ApiOperation({ summary: 'Get workflow version history' })
  async getWorkflowVersions(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.proxyService.get('workflowService', `/api/workflows/${workflowId}/versions`, {
      Authorization: authorization,
    });
  }

  /**
   * Get specific workflow version
   */
  @Get(':workflowId/versions/:versionId')
  @ApiOperation({ summary: 'Get specific workflow version' })
  async getWorkflowVersion(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.proxyService.get('workflowService', `/api/workflows/${workflowId}/versions/${versionId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Rollback to previous version
   */
  @Post(':workflowId/versions/:versionId/rollback')
  @ApiOperation({ summary: 'Rollback to previous workflow version' })
  @HttpCode(HttpStatus.OK)
  async rollbackWorkflowVersion(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.proxyService.post('workflowService', `/api/workflows/${workflowId}/versions/${versionId}/rollback`, {}, {
      Authorization: authorization,
    });
  }

  // ==================== Workflow Logs Endpoints ====================

  /**
   * Get workflow logs
   */
  @Get(':workflowId/logs')
  @ApiOperation({ summary: 'Get workflow logs' })
  async getWorkflowLogs(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Query('level') level?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const queryString = new URLSearchParams();
    if (level) queryString.append('level', level);
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/workflows/${workflowId}/logs${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('workflowService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get execution logs
   */
  @Get(':workflowId/executions/:executionId/logs')
  @ApiOperation({ summary: 'Get workflow execution logs' })
  async getExecutionLogs(
    @Headers('authorization') authorization: string,
    @Param('workflowId') workflowId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.proxyService.get('workflowService', `/api/workflows/${workflowId}/executions/${executionId}/logs`, {
      Authorization: authorization,
    });
  }
}
