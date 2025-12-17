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

@ApiTags('automation')
@ApiBearerAuth('JWT-auth')
@Controller('automation')
export class AutomationController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Automation CRUD Endpoints ====================

  /**
   * Get all automations
   */
  @Get()
  @ApiOperation({ summary: 'Get all automations' })
  async getAllAutomations(
    @Headers('authorization') authorization: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    const queryString = new URLSearchParams();
    if (page) queryString.append('page', page.toString());
    if (limit) queryString.append('limit', limit.toString());
    if (status) queryString.append('status', status);
    if (type) queryString.append('type', type);

    const path = `/api/automations${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('automationService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get automation by ID
   */
  @Get(':automationId')
  @ApiOperation({ summary: 'Get automation by ID' })
  async getAutomationById(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
  ) {
    return this.proxyService.get('automationService', `/api/automations/${automationId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Create new automation
   */
  @Post()
  @ApiOperation({ summary: 'Create new automation' })
  @HttpCode(HttpStatus.CREATED)
  async createAutomation(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('automationService', '/api/automations', body, {
      Authorization: authorization,
    });
  }

  /**
   * Update automation
   */
  @Put(':automationId')
  @ApiOperation({ summary: 'Update automation' })
  async updateAutomation(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('automationService', `/api/automations/${automationId}`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Patch automation
   */
  @Patch(':automationId')
  @ApiOperation({ summary: 'Partially update automation' })
  async patchAutomation(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
    @Body() body: any,
  ) {
    return this.proxyService.patch('automationService', `/api/automations/${automationId}`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Delete automation
   */
  @Delete(':automationId')
  @ApiOperation({ summary: 'Delete automation' })
  async deleteAutomation(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
  ) {
    return this.proxyService.delete('automationService', `/api/automations/${automationId}`, {
      Authorization: authorization,
    });
  }

  // ==================== Automation Control Endpoints ====================

  /**
   * Start automation
   */
  @Post(':automationId/start')
  @ApiOperation({ summary: 'Start automation' })
  @HttpCode(HttpStatus.OK)
  async startAutomation(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
  ) {
    return this.proxyService.post('automationService', `/api/automations/${automationId}/start`, {}, {
      Authorization: authorization,
    });
  }

  /**
   * Stop automation
   */
  @Post(':automationId/stop')
  @ApiOperation({ summary: 'Stop automation' })
  @HttpCode(HttpStatus.OK)
  async stopAutomation(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
  ) {
    return this.proxyService.post('automationService', `/api/automations/${automationId}/stop`, {}, {
      Authorization: authorization,
    });
  }

  /**
   * Pause automation
   */
  @Post(':automationId/pause')
  @ApiOperation({ summary: 'Pause automation' })
  @HttpCode(HttpStatus.OK)
  async pauseAutomation(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
  ) {
    return this.proxyService.post('automationService', `/api/automations/${automationId}/pause`, {}, {
      Authorization: authorization,
    });
  }

  /**
   * Resume automation
   */
  @Post(':automationId/resume')
  @ApiOperation({ summary: 'Resume automation' })
  @HttpCode(HttpStatus.OK)
  async resumeAutomation(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
  ) {
    return this.proxyService.post('automationService', `/api/automations/${automationId}/resume`, {}, {
      Authorization: authorization,
    });
  }

  /**
   * Trigger automation manually
   */
  @Post(':automationId/trigger')
  @ApiOperation({ summary: 'Manually trigger automation' })
  @HttpCode(HttpStatus.OK)
  async triggerAutomation(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('automationService', `/api/automations/${automationId}/trigger`, body, {
      Authorization: authorization,
    });
  }

  // ==================== Automation Execution History Endpoints ====================

  /**
   * Get automation execution history
   */
  @Get(':automationId/executions')
  @ApiOperation({ summary: 'Get automation execution history' })
  async getExecutionHistory(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const queryString = new URLSearchParams();
    if (page) queryString.append('page', page.toString());
    if (limit) queryString.append('limit', limit.toString());
    if (status) queryString.append('status', status);

    const path = `/api/automations/${automationId}/executions${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('automationService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get specific execution details
   */
  @Get(':automationId/executions/:executionId')
  @ApiOperation({ summary: 'Get specific execution details' })
  async getExecutionDetails(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.proxyService.get('automationService', `/api/automations/${automationId}/executions/${executionId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Retry failed execution
   */
  @Post(':automationId/executions/:executionId/retry')
  @ApiOperation({ summary: 'Retry failed automation execution' })
  @HttpCode(HttpStatus.OK)
  async retryExecution(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.proxyService.post('automationService', `/api/automations/${automationId}/executions/${executionId}/retry`, {}, {
      Authorization: authorization,
    });
  }

  /**
   * Cancel running execution
   */
  @Post(':automationId/executions/:executionId/cancel')
  @ApiOperation({ summary: 'Cancel running automation execution' })
  @HttpCode(HttpStatus.OK)
  async cancelExecution(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.proxyService.post('automationService', `/api/automations/${automationId}/executions/${executionId}/cancel`, {}, {
      Authorization: authorization,
    });
  }

  // ==================== Automation Templates Endpoints ====================

  /**
   * Get automation templates
   */
  @Get('templates/all')
  @ApiOperation({ summary: 'Get all automation templates' })
  async getAutomationTemplates(
    @Headers('authorization') authorization: string,
    @Query('category') category?: string,
  ) {
    const queryString = new URLSearchParams();
    if (category) queryString.append('category', category);

    const path = `/api/automations/templates/all${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('automationService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get automation template by ID
   */
  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get automation template by ID' })
  async getAutomationTemplateById(
    @Headers('authorization') authorization: string,
    @Param('templateId') templateId: string,
  ) {
    return this.proxyService.get('automationService', `/api/automations/templates/${templateId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Create automation from template
   */
  @Post('templates/:templateId/create')
  @ApiOperation({ summary: 'Create automation from template' })
  @HttpCode(HttpStatus.CREATED)
  async createFromTemplate(
    @Headers('authorization') authorization: string,
    @Param('templateId') templateId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('automationService', `/api/automations/templates/${templateId}/create`, body, {
      Authorization: authorization,
    });
  }

  // ==================== Automation Scheduling Endpoints ====================

  /**
   * Get automation schedule
   */
  @Get(':automationId/schedule')
  @ApiOperation({ summary: 'Get automation schedule' })
  async getAutomationSchedule(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
  ) {
    return this.proxyService.get('automationService', `/api/automations/${automationId}/schedule`, {
      Authorization: authorization,
    });
  }

  /**
   * Update automation schedule
   */
  @Put(':automationId/schedule')
  @ApiOperation({ summary: 'Update automation schedule' })
  async updateAutomationSchedule(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('automationService', `/api/automations/${automationId}/schedule`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Delete automation schedule
   */
  @Delete(':automationId/schedule')
  @ApiOperation({ summary: 'Delete automation schedule' })
  async deleteAutomationSchedule(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
  ) {
    return this.proxyService.delete('automationService', `/api/automations/${automationId}/schedule`, {
      Authorization: authorization,
    });
  }

  // ==================== Automation Conditions & Actions Endpoints ====================

  /**
   * Get available conditions
   */
  @Get('conditions/available')
  @ApiOperation({ summary: 'Get available automation conditions' })
  async getAvailableConditions(@Headers('authorization') authorization: string) {
    return this.proxyService.get('automationService', '/api/automations/conditions/available', {
      Authorization: authorization,
    });
  }

  /**
   * Get available actions
   */
  @Get('actions/available')
  @ApiOperation({ summary: 'Get available automation actions' })
  async getAvailableActions(@Headers('authorization') authorization: string) {
    return this.proxyService.get('automationService', '/api/automations/actions/available', {
      Authorization: authorization,
    });
  }

  /**
   * Validate automation configuration
   */
  @Post('validate')
  @ApiOperation({ summary: 'Validate automation configuration' })
  @HttpCode(HttpStatus.OK)
  async validateAutomation(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('automationService', '/api/automations/validate', body, {
      Authorization: authorization,
    });
  }

  // ==================== Automation Analytics Endpoints ====================

  /**
   * Get automation statistics
   */
  @Get(':automationId/statistics')
  @ApiOperation({ summary: 'Get automation statistics' })
  async getAutomationStatistics(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/automations/${automationId}/statistics${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('automationService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get automation performance metrics
   */
  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get automation performance metrics' })
  async getPerformanceMetrics(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const queryString = new URLSearchParams();
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/automations/analytics/performance${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('automationService', path, {
      Authorization: authorization,
    });
  }

  // ==================== Automation Logs Endpoints ====================

  /**
   * Get automation logs
   */
  @Get(':automationId/logs')
  @ApiOperation({ summary: 'Get automation logs' })
  async getAutomationLogs(
    @Headers('authorization') authorization: string,
    @Param('automationId') automationId: string,
    @Query('level') level?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const queryString = new URLSearchParams();
    if (level) queryString.append('level', level);
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/automations/${automationId}/logs${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('automationService', path, {
      Authorization: authorization,
    });
  }
}
