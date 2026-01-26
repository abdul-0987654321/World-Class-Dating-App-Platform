/**
 * Trust Score Service
 * Calculates and manages user trust scores
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../infrastructure/database/db-client';
import { config } from '../../config';
import {
  TrustScore,
  TrustLevel,
  TrustBadge,
  TrustComponents,
  TrustSignal,
  TrustHistoryEntry,
  TrustProfile,
  TrustHighlight,
  SignalType,
  RecordSignalRequest,
} from '../types/trust.types';

// ============================================================================
// Signal Impact Values
// ============================================================================

const SIGNAL_IMPACTS: Record<SignalType, number> = {
  verification_completed: 15,
  positive_rating: 8,
  negative_rating: -12,
  report_received: -20,
  ghosting_detected: -15,
  respectful_exit: 10,
  helpful_report: 5,
  community_contribution: 6,
  endorsement_received: 10,
  long_conversation: 4,
  successful_date: 12,
  account_milestone: 8,
};

// ============================================================================
// Service
// ============================================================================

class TrustScoreService {
  /**
   * Get or create trust score for a user
   */
  async getTrustScore(userId: string): Promise<TrustScore> {
    let row = await db('trust_scores').where({ user_id: userId }).first();

    if (!row) {
      row = await this.initializeTrustScore(userId);
    }

    const signals = await this.getRecentSignals(userId);
    const history = await this.getTrustHistory(userId);

    return this.mapRowToTrustScore(row, signals, history);
  }

  /**
   * Initialize trust score for new user
   */
  private async initializeTrustScore(userId: string): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();

    const initialComponents = {
      verification: {
        score: 0,
        emailVerified: false,
        phoneVerified: false,
        photoVerified: false,
        idVerified: false,
        socialLinked: [],
      },
      behavioral: {
        score: 50,
        responseRate: 0,
        averageResponseTimeMinutes: 0,
        conversationCompletionRate: 0,
        ghostingIncidents: 0,
        reportedCount: 0,
        positiveInteractions: 0,
      },
      community: {
        score: 50,
        ratingsReceived: 0,
        averageRating: 0,
        endorsementsReceived: 0,
        feedbackGiven: 0,
        communityContributions: 0,
      },
      accountAge: {
        score: 10,
        accountAgeDays: 0,
        consistentActivityDays: 0,
        profileCompleteness: 0,
      },
      activity: {
        score: 50,
        lastActiveAt: now,
        avgSessionsPerWeek: 0,
        authenticInteractionCount: 0,
        reportsMade: 0,
        helpfulReports: 0,
      },
    };

    const initialScore = {
      user_id: userId,
      overall_score: 40,
      level: 'new' as TrustLevel,
      badge: null,
      components: JSON.stringify(initialComponents),
      last_updated: now,
      created_at: now,
    };

    await db('trust_scores').insert(initialScore);

    // Record initial history entry
    await this.recordHistoryEntry(userId, 40, 'new', 'Account created');

    return initialScore;
  }

  /**
   * Record a trust signal
   */
  async recordSignal(request: RecordSignalRequest): Promise<TrustSignal> {
    const id = uuidv4();
    const impact = request.impact ?? SIGNAL_IMPACTS[request.type] ?? 0;
    const now = new Date().toISOString();

    const signal = {
      id,
      user_id: request.userId,
      type: request.type,
      impact,
      source: request.source,
      metadata: request.metadata ? JSON.stringify(request.metadata) : null,
      created_at: now,
      expires_at: this.calculateSignalExpiry(request.type),
    };

    await db('trust_signals').insert(signal);

    // Recalculate trust score
    await this.recalculateScore(request.userId);

    return {
      id,
      userId: request.userId,
      type: request.type,
      impact,
      source: request.source,
      metadata: request.metadata,
      createdAt: now,
      expiresAt: signal.expires_at,
    };
  }

  /**
   * Calculate signal expiry based on type
   */
  private calculateSignalExpiry(type: SignalType): string | null {
    // Some signals expire, others are permanent
    const expiryDays: Partial<Record<SignalType, number>> = {
      ghosting_detected: 90,
      report_received: 180,
      negative_rating: 365,
    };

    const days = expiryDays[type];
    if (!days) return null;

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry.toISOString();
  }

  /**
   * Recalculate user's trust score
   */
  async recalculateScore(userId: string): Promise<TrustScore> {
    const currentScore = await this.getTrustScore(userId);
    const signals = await this.getRecentSignals(userId);

    // Calculate component scores
    const components = await this.calculateComponents(userId, currentScore.components, signals);

    // Calculate weighted overall score
    const overallScore = this.calculateOverallScore(components);
    const level = this.determineLevel(overallScore);
    const badge = this.determineBadge(components, level);

    // Update database
    await db('trust_scores')
      .where({ user_id: userId })
      .update({
        overall_score: overallScore,
        level,
        badge,
        components: JSON.stringify(components),
        last_updated: new Date().toISOString(),
      });

    // Record history if significant change
    if (Math.abs(overallScore - currentScore.overallScore) >= 5 || level !== currentScore.level) {
      await this.recordHistoryEntry(userId, overallScore, level, 'Score recalculated');
    }

    return this.getTrustScore(userId);
  }

  /**
   * Calculate component scores
   */
  private async calculateComponents(
    userId: string,
    existing: TrustComponents,
    signals: TrustSignal[]
  ): Promise<TrustComponents> {
    // Calculate verification component
    const verificationSignals = signals.filter((s) => s.type === 'verification_completed');
    const verificationScore = Math.min(
      100,
      existing.verification.score + verificationSignals.length * 15
    );

    // Calculate behavioral component from signals
    const ghostingSignals = signals.filter((s) => s.type === 'ghosting_detected').length;
    const respectfulExits = signals.filter((s) => s.type === 'respectful_exit').length;
    const behavioralScore = Math.max(
      0,
      Math.min(
        100,
        50 + respectfulExits * 5 - ghostingSignals * 10 - existing.behavioral.reportedCount * 5
      )
    );

    // Calculate community component
    const positiveRatings = signals.filter((s) => s.type === 'positive_rating').length;
    const negativeRatings = signals.filter((s) => s.type === 'negative_rating').length;
    const endorsements = signals.filter((s) => s.type === 'endorsement_received').length;
    const communityScore = Math.max(
      0,
      Math.min(100, 50 + positiveRatings * 3 + endorsements * 5 - negativeRatings * 8)
    );

    // Calculate account age component (simplified)
    const accountAgeScore = Math.min(
      100,
      existing.accountAge.accountAgeDays * 0.5 + existing.accountAge.profileCompleteness
    );

    // Calculate activity component
    const activityScore = Math.min(
      100,
      existing.activity.authenticInteractionCount * 2 + existing.activity.helpfulReports * 10
    );

    return {
      verification: { ...existing.verification, score: verificationScore },
      behavioral: {
        ...existing.behavioral,
        score: behavioralScore,
        ghostingIncidents: ghostingSignals,
      },
      community: {
        ...existing.community,
        score: communityScore,
        endorsementsReceived: endorsements,
      },
      accountAge: { ...existing.accountAge, score: accountAgeScore },
      activity: { ...existing.activity, score: activityScore },
    };
  }

  /**
   * Calculate weighted overall score
   */
  private calculateOverallScore(components: TrustComponents): number {
    const weights = config.trust;

    const score =
      components.verification.score * weights.verificationWeight +
      components.behavioral.score * weights.behavioralWeight +
      components.community.score * weights.communityWeight +
      components.accountAge.score * weights.accountAgeWeight +
      components.activity.score * weights.activityWeight;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Determine trust level from score
   */
  private determineLevel(score: number): TrustLevel {
    if (score >= 90) return 'highly_trusted';
    if (score >= 75) return 'trusted';
    if (score >= 55) return 'established';
    if (score >= 30) return 'building';
    return 'new';
  }

  /**
   * Determine badge from components and level
   */
  private determineBadge(components: TrustComponents, level: TrustLevel): TrustBadge | null {
    if (components.verification.idVerified) return 'verified_identity';
    if (components.verification.photoVerified) return 'verified_photos';
    if (level === 'highly_trusted') return 'community_champion';
    if (level === 'trusted') return 'trusted_member';
    if (components.accountAge.accountAgeDays >= 365) return 'long_standing_member';
    return null;
  }

  /**
   * Get recent signals for user
   */
  private async getRecentSignals(userId: string): Promise<TrustSignal[]> {
    const rows = await db('trust_signals')
      .where({ user_id: userId })
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', new Date().toISOString());
      })
      .orderBy('created_at', 'desc')
      .limit(100);

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as SignalType,
      impact: row.impact,
      source: row.source,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));
  }

  /**
   * Get trust history for user
   */
  private async getTrustHistory(userId: string): Promise<TrustHistoryEntry[]> {
    const rows = await db('trust_history')
      .where({ user_id: userId })
      .orderBy('timestamp', 'desc')
      .limit(50);

    return rows.map((row) => ({
      score: row.score,
      level: row.level as TrustLevel,
      timestamp: row.timestamp,
      changeReason: row.change_reason,
    }));
  }

  /**
   * Record history entry
   */
  private async recordHistoryEntry(
    userId: string,
    score: number,
    level: TrustLevel,
    reason: string
  ): Promise<void> {
    await db('trust_history').insert({
      id: uuidv4(),
      user_id: userId,
      score,
      level,
      change_reason: reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get public trust profile
   */
  async getTrustProfile(userId: string): Promise<TrustProfile> {
    const trustScore = await this.getTrustScore(userId);

    const badges: TrustBadge[] = [];
    if (trustScore.badge) badges.push(trustScore.badge);
    if (
      trustScore.components.verification.photoVerified &&
      trustScore.badge !== 'verified_photos'
    ) {
      badges.push('verified_photos');
    }

    const highlights = this.generateHighlights(trustScore);

    return {
      userId,
      level: trustScore.level,
      badges,
      verificationStatus: {
        email: trustScore.components.verification.emailVerified,
        phone: trustScore.components.verification.phoneVerified,
        photo: trustScore.components.verification.photoVerified,
        identity: trustScore.components.verification.idVerified,
      },
      memberSince: trustScore.createdAt,
      communityStats: {
        positiveRatings: trustScore.components.community.ratingsReceived,
        endorsements: trustScore.components.community.endorsementsReceived,
      },
      highlights,
    };
  }

  /**
   * Generate profile highlights
   */
  private generateHighlights(trustScore: TrustScore): TrustHighlight[] {
    const highlights: TrustHighlight[] = [];

    if (trustScore.components.verification.idVerified) {
      highlights.push({ type: 'id_verified', label: 'ID Verified', iconEmoji: '✓' });
    }

    if (trustScore.components.verification.photoVerified) {
      highlights.push({ type: 'photo_verified', label: 'Photos Verified', iconEmoji: '📸' });
    }

    if (trustScore.components.behavioral.responseRate >= 80) {
      highlights.push({ type: 'responsive', label: 'Quick Responder', iconEmoji: '⚡' });
    }

    if (trustScore.components.community.endorsementsReceived >= 5) {
      highlights.push({ type: 'endorsed', label: 'Community Endorsed', iconEmoji: '⭐' });
    }

    if (trustScore.components.accountAge.accountAgeDays >= 180) {
      highlights.push({ type: 'established', label: 'Established Member', iconEmoji: '🏆' });
    }

    return highlights.slice(0, 4);
  }

  /**
   * Map database row to TrustScore
   */
  private mapRowToTrustScore(
    row: Record<string, unknown>,
    signals: TrustSignal[],
    history: TrustHistoryEntry[]
  ): TrustScore {
    return {
      userId: row.user_id as string,
      overallScore: row.overall_score as number,
      level: row.level as TrustLevel,
      badge: row.badge as TrustBadge | null,
      components: JSON.parse(row.components as string),
      signals,
      history,
      lastUpdated: row.last_updated as string,
      createdAt: row.created_at as string,
    };
  }
}

export const trustScoreService = new TrustScoreService();
export default trustScoreService;
