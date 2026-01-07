import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

import { ReportService, ReportReason, Report } from './report.service';

// DTOs with validation
class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  reporterId: string;

  @IsString()
  @IsNotEmpty()
  reportedId: string;

  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsString()
  @IsOptional()
  details?: string;
}

class ResolveReportDto {
  @IsString()
  @IsNotEmpty()
  resolution: string;
}

class DismissReportDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * Create a new report
   * POST /api/v1/reports
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReport(@Body() createReportDto: CreateReportDto): Promise<{
    success: boolean;
    data: Report;
    message: string;
  }> {
    const report = await this.reportService.createReport(
      createReportDto.reporterId,
      createReportDto.reportedId,
      createReportDto.reason,
      createReportDto.details || ''
    );

    return {
      success: true,
      data: report,
      message: 'Report created successfully',
    };
  }

  /**
   * Get report by ID
   * GET /api/v1/reports/:reportId
   */
  @Get(':reportId')
  async getReport(@Param('reportId') reportId: string): Promise<{
    success: boolean;
    data: Report;
  }> {
    const report = await this.reportService.getReportById(reportId);

    return {
      success: true,
      data: report,
    };
  }

  /**
   * Get report status
   * GET /api/v1/reports/:reportId/status
   */
  @Get(':reportId/status')
  async getReportStatus(@Param('reportId') reportId: string): Promise<{
    success: boolean;
    data: { id: string; status: string };
  }> {
    const status = await this.reportService.getReportStatus(reportId);

    return {
      success: true,
      data: status,
    };
  }

  /**
   * Get reports for a user
   * GET /api/v1/reports/user/:userId
   * Query params: type=filed|received (default: filed)
   */
  @Get('user/:userId')
  async getUserReports(
    @Param('userId') userId: string,
    @Query('type') type: 'filed' | 'received' = 'filed'
  ): Promise<{
    success: boolean;
    data: Report[];
    meta: { count: number; type: string };
  }> {
    const reports = await this.reportService.getUserReports(userId, type);

    return {
      success: true,
      data: reports,
      meta: {
        count: reports.length,
        type,
      },
    };
  }

  /**
   * Get all pending reports (for moderation)
   * GET /api/v1/reports/pending
   */
  @Get('queue/pending')
  async getPendingReports(): Promise<{
    success: boolean;
    data: Report[];
    meta: { count: number };
  }> {
    const reports = await this.reportService.getPendingReports();

    return {
      success: true,
      data: reports,
      meta: {
        count: reports.length,
      },
    };
  }

  /**
   * Escalate a report
   * PUT /api/v1/reports/:reportId/escalate
   */
  @Put(':reportId/escalate')
  async escalateReport(@Param('reportId') reportId: string): Promise<{
    success: boolean;
    data: Report;
    message: string;
  }> {
    const report = await this.reportService.escalateReport(reportId);

    return {
      success: true,
      data: report,
      message: 'Report escalated successfully',
    };
  }

  /**
   * Mark report as under review
   * PUT /api/v1/reports/:reportId/review
   */
  @Put(':reportId/review')
  async markUnderReview(@Param('reportId') reportId: string): Promise<{
    success: boolean;
    data: Report;
    message: string;
  }> {
    const report = await this.reportService.markUnderReview(reportId);

    return {
      success: true,
      data: report,
      message: 'Report marked as under review',
    };
  }

  /**
   * Resolve a report
   * PUT /api/v1/reports/:reportId/resolve
   */
  @Put(':reportId/resolve')
  async resolveReport(
    @Param('reportId') reportId: string,
    @Body() resolveDto: ResolveReportDto
  ): Promise<{
    success: boolean;
    data: Report;
    message: string;
  }> {
    const report = await this.reportService.resolveReport(
      reportId,
      resolveDto.resolution
    );

    return {
      success: true,
      data: report,
      message: 'Report resolved successfully',
    };
  }

  /**
   * Dismiss a report
   * PUT /api/v1/reports/:reportId/dismiss
   */
  @Put(':reportId/dismiss')
  async dismissReport(
    @Param('reportId') reportId: string,
    @Body() dismissDto: DismissReportDto
  ): Promise<{
    success: boolean;
    data: Report;
    message: string;
  }> {
    const report = await this.reportService.dismissReport(
      reportId,
      dismissDto.reason || 'Report dismissed'
    );

    return {
      success: true,
      data: report,
      message: 'Report dismissed',
    };
  }
}
