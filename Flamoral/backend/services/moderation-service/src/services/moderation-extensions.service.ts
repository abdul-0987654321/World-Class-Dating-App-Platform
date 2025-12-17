/**
 * Additional moderation service methods for reports, blocking, and queue management
 * These methods should be added to moderation.service.ts
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../infrastructure/database/connection';
import { createLogger } from '../utils/logger';

const logger = createLogger('moderation-extensions');

export interface ReportInput {
  reporterId: string;
  reportedUserId?: string;
  contentId?: string;
  reportType: string;
  reason: string;
  description?: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  contentId?: string;
  reportType: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
}

export interface GetReportsParams {
  status?: string;
  reportType?: string;
  limit?: number;
  offset?: number;
}

export interface ModerationQueueParams {
  status?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create a new report
 */
export async function createReport(input: ReportInput): Promise<Report> {
  const report = {
    id: uuidv4(),
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId,
    content_id: input.contentId,
    report_type: input.reportType,
    reason: input.reason,
    description: input.description,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db('reports').insert(report);

  logger.info(`Report created: ${report.id}`);

  return {
    id: report.id,
    reporterId: report.reporter_id,
    reportedUserId: report.reported_user_id,
    contentId: report.content_id,
    reportType: report.report_type,
    reason: report.reason,
    description: report.description,
    status: report.status,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
  };
}

/**
 * Get a report by ID
 */
export async function getReport(reportId: string): Promise<Report | null> {
  const report = await db('reports').where('id', reportId).first();

  if (!report) {
    return null;
  }

  return {
    id: report.id,
    reporterId: report.reporter_id,
    reportedUserId: report.reported_user_id,
    contentId: report.content_id,
    reportType: report.report_type,
    reason: report.reason,
    description: report.description,
    status: report.status,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
    resolvedBy: report.resolved_by,
    resolvedAt: report.resolved_at,
    resolutionNotes: report.resolution_notes,
  };
}

/**
 * Get all reports with optional filtering and pagination
 */
export async function getReports(params: GetReportsParams): Promise<{ reports: Report[]; total: number }> {
  const { status, reportType, limit = 50, offset = 0 } = params;

  let query = db('reports');

  if (status) {
    query = query.where('status', status);
  }

  if (reportType) {
    query = query.where('report_type', reportType);
  }

  const reports = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  // Get total count
  let countQuery = db('reports');
  if (status) {
    countQuery = countQuery.where('status', status);
  }
  if (reportType) {
    countQuery = countQuery.where('report_type', reportType);
  }

  const totalResult = await countQuery.count('id as count').first();
  const total = parseInt(totalResult?.count as string) || 0;

  return {
    reports: reports.map((r: any) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reportedUserId: r.reported_user_id,
      contentId: r.content_id,
      reportType: r.report_type,
      reason: r.reason,
      description: r.description,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      resolvedBy: r.resolved_by,
      resolvedAt: r.resolved_at,
      resolutionNotes: r.resolution_notes,
    })),
    total,
  };
}

/**
 * Resolve a report
 */
export async function resolveReport(
  reportId: string,
  adminId: string,
  action: string,
  notes?: string
): Promise<void> {
  await db('reports')
    .where('id', reportId)
    .update({
      status: 'resolved',
      resolved_by: adminId,
      resolved_at: new Date(),
      resolution_notes: notes,
      resolution_action: action,
      updated_at: new Date(),
    });

  logger.info(`Report ${reportId} resolved by admin ${adminId} with action: ${action}`);
}

/**
 * Block a user
 */
export async function blockUser(userId: string, blockedUserId: string): Promise<void> {
  // Check if block already exists
  const existing = await db('user_blocks')
    .where('user_id', userId)
    .where('blocked_user_id', blockedUserId)
    .first();

  if (existing) {
    logger.warn(`User ${userId} already blocked user ${blockedUserId}`);
    return;
  }

  await db('user_blocks').insert({
    id: uuidv4(),
    user_id: userId,
    blocked_user_id: blockedUserId,
    created_at: new Date(),
  });

  logger.info(`User ${userId} blocked user ${blockedUserId}`);
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string, blockedUserId: string): Promise<void> {
  await db('user_blocks')
    .where('user_id', userId)
    .where('blocked_user_id', blockedUserId)
    .delete();

  logger.info(`User ${userId} unblocked user ${blockedUserId}`);
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(userId: string): Promise<string[]> {
  const blocks = await db('user_blocks')
    .where('user_id', userId)
    .select('blocked_user_id');

  return blocks.map((b: any) => b.blocked_user_id);
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(userId: string, targetUserId: string): Promise<boolean> {
  const block = await db('user_blocks')
    .where('user_id', userId)
    .where('blocked_user_id', targetUserId)
    .first();

  return !!block;
}

/**
 * Get moderation queue
 */
export async function getModerationQueue(params: ModerationQueueParams): Promise<{ items: any[]; total: number }> {
  const { status, priority, limit = 50, offset = 0 } = params;

  let query = db('moderation_queue');

  if (status) {
    query = query.where('status', status);
  }

  if (priority) {
    query = query.where('priority', priority);
  }

  const items = await query
    .orderBy('priority', 'desc')
    .orderBy('flagged_at', 'asc')
    .limit(limit)
    .offset(offset);

  // Get total count
  let countQuery = db('moderation_queue');
  if (status) {
    countQuery = countQuery.where('status', status);
  }
  if (priority) {
    countQuery = countQuery.where('priority', priority);
  }

  const totalResult = await countQuery.count('id as count').first();
  const total = parseInt(totalResult?.count as string) || 0;

  return {
    items: items.map((item: any) => ({
      id: item.id,
      contentId: item.content_id,
      contentType: item.content_type,
      contentUrl: item.content_url,
      contentText: item.content_text,
      userId: item.user_id,
      riskScore: parseFloat(item.risk_score),
      violations: item.violations || [],
      status: item.status,
      priority: item.priority,
      flaggedAt: item.flagged_at,
      assignedTo: item.assigned_to,
      assignedAt: item.assigned_at,
    })),
    total,
  };
}

/**
 * Review a queue item
 */
export async function reviewQueueItem(
  queueId: string,
  moderatorId: string,
  action: string,
  notes?: string
): Promise<void> {
  const queueItem = await db('moderation_queue').where('id', queueId).first();

  if (!queueItem) {
    throw new Error('Queue item not found');
  }

  // Update the queue item
  await db('moderation_queue')
    .where('id', queueId)
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      assigned_to: moderatorId,
      assigned_at: new Date(),
      updated_at: new Date(),
    });

  // Create a moderation log entry
  await db('moderation_logs').insert({
    id: uuidv4(),
    content_id: queueItem.content_id,
    content_type: queueItem.content_type,
    content_url: queueItem.content_url,
    content_text: queueItem.content_text,
    user_id: queueItem.user_id,
    status: action === 'approve' ? 'approved' : 'rejected',
    action: action === 'approve' ? 'manual_approved' : 'manual_rejected',
    risk_score: queueItem.risk_score,
    violations: queueItem.violations || [],
    recommendations: [],
    moderated_at: new Date(),
    moderated_by: moderatorId,
    reviewed_at: new Date(),
    reviewed_by: moderatorId,
    review_notes: notes,
    created_at: new Date(),
    updated_at: new Date(),
  });

  logger.info(`Queue item ${queueId} reviewed by ${moderatorId}: ${action}`);
}
