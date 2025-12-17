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
import { Public } from '../decorators/public.decorator';

@ApiTags('policy')
@ApiBearerAuth('JWT-auth')
@Controller('policy')
export class PolicyController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Policy CRUD Endpoints ====================

  /**
   * Get all policies
   */
  @Get()
  @ApiOperation({ summary: 'Get all policies' })
  async getAllPolicies(
    @Headers('authorization') authorization: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    const queryString = new URLSearchParams();
    if (page) queryString.append('page', page.toString());
    if (limit) queryString.append('limit', limit.toString());
    if (type) queryString.append('type', type);
    if (status) queryString.append('status', status);

    const path = `/api/policies${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('policyService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get policy by ID
   */
  @Get(':policyId')
  @ApiOperation({ summary: 'Get policy by ID' })
  async getPolicyById(
    @Headers('authorization') authorization: string,
    @Param('policyId') policyId: string,
  ) {
    return this.proxyService.get('policyService', `/api/policies/${policyId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Create new policy
   */
  @Post()
  @ApiOperation({ summary: 'Create new policy' })
  @HttpCode(HttpStatus.CREATED)
  async createPolicy(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('policyService', '/api/policies', body, {
      Authorization: authorization,
    });
  }

  /**
   * Update policy
   */
  @Put(':policyId')
  @ApiOperation({ summary: 'Update policy' })
  async updatePolicy(
    @Headers('authorization') authorization: string,
    @Param('policyId') policyId: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('policyService', `/api/policies/${policyId}`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Patch policy
   */
  @Patch(':policyId')
  @ApiOperation({ summary: 'Partially update policy' })
  async patchPolicy(
    @Headers('authorization') authorization: string,
    @Param('policyId') policyId: string,
    @Body() body: any,
  ) {
    return this.proxyService.patch('policyService', `/api/policies/${policyId}`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Delete policy
   */
  @Delete(':policyId')
  @ApiOperation({ summary: 'Delete policy' })
  async deletePolicy(
    @Headers('authorization') authorization: string,
    @Param('policyId') policyId: string,
  ) {
    return this.proxyService.delete('policyService', `/api/policies/${policyId}`, {
      Authorization: authorization,
    });
  }

  // ==================== Policy Evaluation Endpoints ====================

  /**
   * Evaluate policy for a specific action
   */
  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate policy for specific action' })
  @HttpCode(HttpStatus.OK)
  async evaluatePolicy(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('policyService', '/api/policies/evaluate', body, {
      Authorization: authorization,
    });
  }

  /**
   * Bulk evaluate policies
   */
  @Post('evaluate/bulk')
  @ApiOperation({ summary: 'Bulk evaluate multiple policies' })
  @HttpCode(HttpStatus.OK)
  async bulkEvaluatePolicy(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('policyService', '/api/policies/evaluate/bulk', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get policy evaluation history
   */
  @Get('evaluations/history')
  @ApiOperation({ summary: 'Get policy evaluation history' })
  async getEvaluationHistory(
    @Headers('authorization') authorization: string,
    @Query('policyId') policyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const queryString = new URLSearchParams();
    if (policyId) queryString.append('policyId', policyId);
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/policies/evaluations/history${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('policyService', path, {
      Authorization: authorization,
    });
  }

  // ==================== Policy Templates Endpoints ====================

  /**
   * Get policy templates
   */
  @Get('templates/all')
  @ApiOperation({ summary: 'Get all policy templates' })
  async getPolicyTemplates(@Headers('authorization') authorization: string) {
    return this.proxyService.get('policyService', '/api/policies/templates/all', {
      Authorization: authorization,
    });
  }

  /**
   * Get policy template by ID
   */
  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get policy template by ID' })
  async getPolicyTemplateById(
    @Headers('authorization') authorization: string,
    @Param('templateId') templateId: string,
  ) {
    return this.proxyService.get('policyService', `/api/policies/templates/${templateId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Create policy from template
   */
  @Post('templates/:templateId/create')
  @ApiOperation({ summary: 'Create policy from template' })
  @HttpCode(HttpStatus.CREATED)
  async createFromTemplate(
    @Headers('authorization') authorization: string,
    @Param('templateId') templateId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('policyService', `/api/policies/templates/${templateId}/create`, body, {
      Authorization: authorization,
    });
  }

  // ==================== Policy Compliance Endpoints ====================

  /**
   * Get compliance status
   */
  @Get('compliance/status')
  @ApiOperation({ summary: 'Get policy compliance status' })
  async getComplianceStatus(
    @Headers('authorization') authorization: string,
    @Query('entityId') entityId?: string,
    @Query('entityType') entityType?: string,
  ) {
    const queryString = new URLSearchParams();
    if (entityId) queryString.append('entityId', entityId);
    if (entityType) queryString.append('entityType', entityType);

    const path = `/api/policies/compliance/status${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('policyService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get compliance violations
   */
  @Get('compliance/violations')
  @ApiOperation({ summary: 'Get policy compliance violations' })
  async getComplianceViolations(
    @Headers('authorization') authorization: string,
    @Query('severity') severity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const queryString = new URLSearchParams();
    if (severity) queryString.append('severity', severity);
    if (from) queryString.append('from', from);
    if (to) queryString.append('to', to);

    const path = `/api/policies/compliance/violations${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('policyService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Remediate compliance violation
   */
  @Post('compliance/violations/:violationId/remediate')
  @ApiOperation({ summary: 'Remediate compliance violation' })
  @HttpCode(HttpStatus.OK)
  async remediateViolation(
    @Headers('authorization') authorization: string,
    @Param('violationId') violationId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('policyService', `/api/policies/compliance/violations/${violationId}/remediate`, body, {
      Authorization: authorization,
    });
  }

  // ==================== Policy Versioning Endpoints ====================

  /**
   * Get policy versions
   */
  @Get(':policyId/versions')
  @ApiOperation({ summary: 'Get policy version history' })
  async getPolicyVersions(
    @Headers('authorization') authorization: string,
    @Param('policyId') policyId: string,
  ) {
    return this.proxyService.get('policyService', `/api/policies/${policyId}/versions`, {
      Authorization: authorization,
    });
  }

  /**
   * Get specific policy version
   */
  @Get(':policyId/versions/:versionId')
  @ApiOperation({ summary: 'Get specific policy version' })
  async getPolicyVersion(
    @Headers('authorization') authorization: string,
    @Param('policyId') policyId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.proxyService.get('policyService', `/api/policies/${policyId}/versions/${versionId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Rollback to previous version
   */
  @Post(':policyId/versions/:versionId/rollback')
  @ApiOperation({ summary: 'Rollback to previous policy version' })
  @HttpCode(HttpStatus.OK)
  async rollbackPolicyVersion(
    @Headers('authorization') authorization: string,
    @Param('policyId') policyId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.proxyService.post('policyService', `/api/policies/${policyId}/versions/${versionId}/rollback`, {}, {
      Authorization: authorization,
    });
  }

  // ==================== Public Policy Endpoints ====================

  /**
   * Get public policies (Terms, Privacy, etc.)
   */
  @Public()
  @Get('public/:policyType')
  @ApiOperation({ summary: 'Get public policy (Terms, Privacy, etc.)' })
  async getPublicPolicy(@Param('policyType') policyType: string) {
    return this.proxyService.get('policyService', `/api/policies/public/${policyType}`, {});
  }
}
