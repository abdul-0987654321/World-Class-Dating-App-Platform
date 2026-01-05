import db from '../../infrastructure/database/connection';
import {
  Report,
  ReportCreateInput,
  ReportUpdateInput,
  REPORT_STATUS,
} from '../entities/Report.entity';

export class ReportRepository {
  private tableName = 'reports';

  async create(input: ReportCreateInput): Promise<Report> {
    const now = new Date();
    const reportData = {
      reporter_id: input.reporterId,
      reported_id: input.reportedId,
      report_type: input.reportType,
      description: input.description,
      evidence_urls: input.evidenceUrls ? JSON.stringify(input.evidenceUrls) : null,
      status: REPORT_STATUS.PENDING,
      severity: input.severity || 'medium',
      created_at: now,
      updated_at: now,
    };

    const [report] = await db(this.tableName).insert(reportData).returning('*');

    return this.mapToEntity(report);
  }

  async findById(id: string): Promise<Report | null> {
    const report = await db(this.tableName).where({ id }).first();

    return report ? this.mapToEntity(report) : null;
  }

  async findByReporterId(
    reporterId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Report[]> {
    let query = db(this.tableName).where({ reporter_id: reporterId }).orderBy('created_at', 'desc');

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.offset(options.offset);

    const reports = await query.select('*');
    return reports.map(this.mapToEntity);
  }

  async findByReportedId(
    reportedId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ): Promise<Report[]> {
    let query = db(this.tableName).where({ reported_id: reportedId }).orderBy('created_at', 'desc');

    if (options?.status) query = query.where({ status: options.status });
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.offset(options.offset);

    const reports = await query.select('*');
    return reports.map(this.mapToEntity);
  }

  async findByStatus(
    status: string,
    options?: {
      limit?: number;
      offset?: number;
      severity?: string;
    }
  ): Promise<Report[]> {
    let query = db(this.tableName).where({ status }).orderBy('created_at', 'asc');

    if (options?.severity) query = query.where({ severity: options.severity });
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.offset(options.offset);

    const reports = await query.select('*');
    return reports.map(this.mapToEntity);
  }

  async findBySeverity(
    severity: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Report[]> {
    let query = db(this.tableName)
      .where({ severity })
      .where('status', 'in', [REPORT_STATUS.PENDING, REPORT_STATUS.INVESTIGATING])
      .orderBy('created_at', 'asc');

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.offset(options.offset);

    const reports = await query.select('*');
    return reports.map(this.mapToEntity);
  }

  async update(id: string, input: ReportUpdateInput): Promise<Report> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.status !== undefined) updateData.status = input.status;
    if (input.resolution !== undefined) updateData.resolution = input.resolution;
    if (input.actionTaken !== undefined) updateData.action_taken = input.actionTaken;
    if (input.resolvedBy !== undefined) updateData.resolved_by = input.resolvedBy;
    if (input.resolvedAt !== undefined) updateData.resolved_at = input.resolvedAt;

    const [report] = await db(this.tableName).where({ id }).update(updateData).returning('*');

    return this.mapToEntity(report);
  }

  async resolveReport(
    id: string,
    resolution: string,
    actionTaken: Report['actionTaken'],
    resolvedBy: string
  ): Promise<Report> {
    const [report] = await db(this.tableName)
      .where({ id })
      .update({
        status: REPORT_STATUS.RESOLVED,
        resolution,
        action_taken: actionTaken,
        resolved_by: resolvedBy,
        resolved_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(report);
  }

  async dismissReport(id: string, resolvedBy: string, reason: string): Promise<Report> {
    const [report] = await db(this.tableName)
      .where({ id })
      .update({
        status: REPORT_STATUS.DISMISSED,
        resolution: reason,
        resolved_by: resolvedBy,
        resolved_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(report);
  }

  async countByReportedId(reportedId: string): Promise<number> {
    const result = await db(this.tableName)
      .where({ reported_id: reportedId })
      .count('* as count')
      .first();

    return parseInt((result?.count as string) || '0', 10);
  }

  async countByStatus(status: string): Promise<number> {
    const result = await db(this.tableName).where({ status }).count('* as count').first();

    return parseInt((result?.count as string) || '0', 10);
  }

  async getReportStats(): Promise<{
    total: number;
    pending: number;
    investigating: number;
    resolved: number;
    dismissed: number;
  }> {
    const stats = await db(this.tableName).select('status').count('* as count').groupBy('status');

    const result = {
      total: 0,
      pending: 0,
      investigating: 0,
      resolved: 0,
      dismissed: 0,
    };

    stats.forEach((row: any) => {
      const count = parseInt(row.count, 10);
      result.total += count;

      switch (row.status) {
        case REPORT_STATUS.PENDING:
          result.pending = count;
          break;
        case REPORT_STATUS.INVESTIGATING:
          result.investigating = count;
          break;
        case REPORT_STATUS.RESOLVED:
        case REPORT_STATUS.ACTION_TAKEN:
          result.resolved += count;
          break;
        case REPORT_STATUS.DISMISSED:
          result.dismissed = count;
          break;
      }
    });

    return result;
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName).where({ id }).del();
  }

  // Map database row to entity
  private mapToEntity(row: any): Report {
    return {
      id: row.id,
      reporterId: row.reporter_id,
      reportedId: row.reported_id,
      reportType: row.report_type,
      description: row.description,
      evidenceUrls: row.evidence_urls ? JSON.parse(row.evidence_urls) : undefined,
      status: row.status,
      severity: row.severity,
      resolution: row.resolution,
      actionTaken: row.action_taken,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new ReportRepository();
