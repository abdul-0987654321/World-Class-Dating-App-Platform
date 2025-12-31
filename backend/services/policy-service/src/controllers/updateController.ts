/**
 * Update Controller
 * Handles policy updates, publishing, and workflow management
 */

import { logAudit } from './versionController';

// Update workflow statuses
type UpdateStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'archived';
type TranslationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

// Policy update storage
interface PolicyUpdate {
  id: string;
  policyType: string;
  version: string;
  status: UpdateStatus;
  content: any;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  reviewers: string[];
  reviews: Array<{
    reviewerId: string;
    status: 'approved' | 'rejected' | 'changes_requested';
    comments: string;
    reviewedAt: string;
  }>;
  publishedAt?: string;
  scheduledPublishAt?: string;
}

// Translation request storage
interface TranslationRequest {
  id: string;
  policyType: string;
  sourceLanguage: string;
  targetLanguages: string[];
  status: TranslationStatus;
  createdAt: string;
  completedAt?: string;
  translations: Array<{
    language: string;
    status: TranslationStatus;
    translator?: string;
    content?: string;
    completedAt?: string;
  }>;
}

// In-memory storage (in production, this would be a database)
const pendingUpdates: Map<string, PolicyUpdate> = new Map();
const translationRequests: Map<string, TranslationRequest> = new Map();
let updateIdCounter = 0;
let translationIdCounter = 0;

// Monitoring metrics
const monitoringMetrics = {
  lastCheck: new Date().toISOString(),
  policiesMonitored: 3,
  pendingUpdates: 0,
  pendingTranslations: 0,
  lastPublished: null as string | null,
  uptime: process.uptime(),
  healthChecks: {
    database: 'healthy',
    cache: 'healthy',
    storage: 'healthy',
  },
};

export interface TriggerUpdateParams {
  policyType: string;
  content: any;
  version: string;
  createdBy: string;
  scheduledPublishAt?: string;
}

export interface PublishPolicyParams {
  updateId: string;
  publishedBy: string;
  notifyUsers?: boolean;
}

export interface SubmitReviewParams {
  updateId: string;
  reviewerId: string;
  status: 'approved' | 'rejected' | 'changes_requested';
  comments: string;
}

export interface TranslationParams {
  policyType: string;
  version: string;
  sourceLanguage: string;
  targetLanguages: string[];
  requestedBy: string;
}

export class UpdateController {
  /**
   * Triggers a policy update workflow
   */
  async triggerUpdate(params: TriggerUpdateParams) {
    const { policyType, content, version, createdBy, scheduledPublishAt } = params;

    const updateId = `update-${++updateIdCounter}-${Date.now()}`;
    const now = new Date().toISOString();

    const update: PolicyUpdate = {
      id: updateId,
      policyType,
      version,
      status: 'draft',
      content,
      createdAt: now,
      updatedAt: now,
      createdBy,
      reviewers: [],
      reviews: [],
      scheduledPublishAt,
    };

    pendingUpdates.set(updateId, update);
    monitoringMetrics.pendingUpdates = pendingUpdates.size;

    // Log audit
    logAudit({
      action: 'create',
      policyType,
      version,
      userId: createdBy,
      details: { updateId, scheduledPublishAt },
    });

    return {
      updateId,
      status: update.status,
      policyType,
      version,
      createdAt: now,
      message: 'Policy update created successfully',
      nextSteps: [
        'Add reviewers to the update',
        'Submit for review when ready',
        'Publish after approval',
      ],
    };
  }

  /**
   * Gets current monitoring status
   */
  async getMonitoringStatus() {
    monitoringMetrics.lastCheck = new Date().toISOString();
    monitoringMetrics.pendingUpdates = pendingUpdates.size;
    monitoringMetrics.pendingTranslations = translationRequests.size;
    monitoringMetrics.uptime = process.uptime();

    return {
      status: 'active',
      metrics: monitoringMetrics,
      checks: {
        policyService: 'healthy',
        versionControl: 'healthy',
        translationService: translationRequests.size > 0 ? 'busy' : 'idle',
        reviewWorkflow: pendingUpdates.size > 0 ? 'active' : 'idle',
      },
      alerts: this.getActiveAlerts(),
      lastUpdated: monitoringMetrics.lastCheck,
    };
  }

  private getActiveAlerts(): Array<{ type: string; message: string; severity: string }> {
    const alerts: Array<{ type: string; message: string; severity: string }> = [];

    // Check for stale pending updates
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const update of pendingUpdates.values()) {
      if (new Date(update.createdAt).getTime() < oneWeekAgo && update.status === 'pending_review') {
        alerts.push({
          type: 'stale_review',
          message: `Update ${update.id} has been pending review for over a week`,
          severity: 'warning',
        });
      }
    }

    return alerts;
  }

  /**
   * Publishes a policy update
   */
  async publishPolicy(params: PublishPolicyParams) {
    const { updateId, publishedBy, notifyUsers = true } = params;

    const update = pendingUpdates.get(updateId);
    if (!update) {
      throw new Error(`Update not found: ${updateId}`);
    }

    if (update.status !== 'approved') {
      throw new Error(`Cannot publish update with status: ${update.status}. Must be approved first.`);
    }

    const now = new Date().toISOString();

    update.status = 'published';
    update.publishedAt = now;
    update.updatedAt = now;

    monitoringMetrics.lastPublished = now;

    // Log audit
    logAudit({
      action: 'publish',
      policyType: update.policyType,
      version: update.version,
      userId: publishedBy,
      details: { updateId, notifyUsers },
    });

    return {
      published: true,
      updateId,
      policyType: update.policyType,
      version: update.version,
      publishedAt: now,
      publishedBy,
      notificationsSent: notifyUsers,
      message: `Policy ${update.policyType} version ${update.version} has been published`,
    };
  }

  /**
   * Gets all pending policy updates
   */
  async getPendingPolicies() {
    const pending: PolicyUpdate[] = [];

    for (const update of pendingUpdates.values()) {
      if (['draft', 'pending_review', 'approved'].includes(update.status)) {
        pending.push(update);
      }
    }

    return pending.map(update => ({
      id: update.id,
      policyType: update.policyType,
      version: update.version,
      status: update.status,
      createdAt: update.createdAt,
      createdBy: update.createdBy,
      reviewCount: update.reviews.length,
      approvalCount: update.reviews.filter(r => r.status === 'approved').length,
      scheduledPublishAt: update.scheduledPublishAt,
    }));
  }

  /**
   * Submits a review for a policy update
   */
  async submitReview(params: SubmitReviewParams) {
    const { updateId, reviewerId, status, comments } = params;

    const update = pendingUpdates.get(updateId);
    if (!update) {
      throw new Error(`Update not found: ${updateId}`);
    }

    if (update.status !== 'pending_review' && update.status !== 'draft') {
      throw new Error(`Cannot review update with status: ${update.status}`);
    }

    const now = new Date().toISOString();

    // Add review
    update.reviews.push({
      reviewerId,
      status,
      comments,
      reviewedAt: now,
    });

    // Update status based on reviews
    if (status === 'rejected') {
      update.status = 'rejected';
    } else if (status === 'approved') {
      // Check if all required reviewers have approved
      const approvals = update.reviews.filter(r => r.status === 'approved').length;
      if (approvals >= 2) { // Require 2 approvals
        update.status = 'approved';
      }
    } else {
      update.status = 'pending_review';
    }

    update.updatedAt = now;

    // Log audit
    logAudit({
      action: 'update',
      policyType: update.policyType,
      version: update.version,
      userId: reviewerId,
      details: { updateId, reviewStatus: status, newStatus: update.status },
    });

    return {
      reviewId: `review-${Date.now()}`,
      updateId,
      reviewerId,
      status,
      updateStatus: update.status,
      reviewedAt: now,
      message: status === 'approved'
        ? 'Review submitted. ' + (update.status === 'approved' ? 'Update is now approved for publishing.' : 'Waiting for more approvals.')
        : `Review submitted with status: ${status}`,
    };
  }

  /**
   * Requests translation for a policy
   */
  async requestTranslation(params: TranslationParams) {
    const { policyType, version, sourceLanguage, targetLanguages, requestedBy } = params;

    const translationId = `trans-${++translationIdCounter}-${Date.now()}`;
    const now = new Date().toISOString();

    const request: TranslationRequest = {
      id: translationId,
      policyType,
      sourceLanguage,
      targetLanguages,
      status: 'pending',
      createdAt: now,
      translations: targetLanguages.map(lang => ({
        language: lang,
        status: 'pending' as TranslationStatus,
      })),
    };

    translationRequests.set(translationId, request);
    monitoringMetrics.pendingTranslations = translationRequests.size;

    // Log audit
    logAudit({
      action: 'create',
      policyType,
      version,
      userId: requestedBy,
      details: { translationId, sourceLanguage, targetLanguages },
    });

    return {
      translationId,
      policyType,
      version,
      sourceLanguage,
      targetLanguages,
      status: 'pending',
      createdAt: now,
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      message: `Translation request created for ${targetLanguages.length} languages`,
    };
  }

  /**
   * Gets translation status
   */
  async getTranslationStatus(translationId?: string) {
    if (translationId) {
      const request = translationRequests.get(translationId);
      if (!request) {
        throw new Error(`Translation request not found: ${translationId}`);
      }
      return request;
    }

    // Return all translation requests
    const translations = Array.from(translationRequests.values()).map(req => ({
      id: req.id,
      policyType: req.policyType,
      sourceLanguage: req.sourceLanguage,
      targetLanguages: req.targetLanguages,
      status: req.status,
      createdAt: req.createdAt,
      completedCount: req.translations.filter(t => t.status === 'completed').length,
      totalCount: req.translations.length,
    }));

    return {
      translations,
      summary: {
        total: translations.length,
        pending: translations.filter(t => t.status === 'pending').length,
        inProgress: translations.filter(t => t.status === 'in_progress').length,
        completed: translations.filter(t => t.status === 'completed').length,
      },
    };
  }
}
