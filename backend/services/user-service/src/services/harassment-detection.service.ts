/**
 * Harassment Detection AI Service
 * Uses NLP and ML to detect harassment, threats, and inappropriate content in real-time
 */

import { db } from '../infrastructure/database';
import logger from '../utils/logger';

// Harassment patterns and keywords
const HARASSMENT_PATTERNS = {
  direct_threats: [
    /\b(kill|murder|hurt|harm|attack|beat|stab|shoot|strangle)\s*(you|u|her|him|them)\b/gi,
    /\b(gonna|going\s+to|will|i'll)\s*(kill|murder|hurt|harm|attack|beat)\b/gi,
    /\bi('ll|'m\s+gonna)\s*(find|track|stalk|hunt)\s*(you|u|her|him|your\s+family)\b/gi,
    /\b(you('re|r)?\s+dead|you\s+will\s+die|watch\s+your\s+back)\b/gi,
  ],
  sexual_harassment: [
    /\b(send\s+)(nudes?|pics?|photos?|naked|dick\s+pic)\b/gi,
    /\b(show\s+me\s+your|let\s+me\s+see\s+your)\s*(body|tits?|ass|boobs?|pussy|cock|dick)\b/gi,
    /\b(wanna|want\s+to)\s*(fuck|bang|screw|bone)\b/gi,
    /\bsuck\s+my\s+(dick|cock)\b/gi,
    /\bi\s+want\s+to\s+(touch|feel|grab|grope)\s+you\b/gi,
  ],
  stalking_behavior: [
    /\b(i\s+know\s+where\s+you)\s*(live|work|go|stay)\b/gi,
    /\b(found\s+your|know\s+your)\s*(address|home|work|school|car)\b/gi,
    /\b(i('m|'ll\s+be)?\s+watching|following)\s*(you|u)\b/gi,
    /\b(can't|won't)\s*(escape|hide|run|get\s+away)\s*(from\s+me)?\b/gi,
  ],
  blackmail_coercion: [
    /\b(send|give)\s*(money|cash|payment|bitcoin)\s+(or|else)\b/gi,
    /\b(i('ll|'m\s+gonna)?\s+)(share|post|send|leak)\s*(your|the)\s*(pics?|photos?|nudes?|videos?)\b/gi,
    /\b(do\s+what\s+i\s+say|obey\s+me|or\s+else)\b/gi,
    /\b(expose|expose\s+you|tell\s+everyone)\b/gi,
  ],
  manipulation: [
    /\b(no\s+one\s+(else\s+)?(will|would)\s+(love|want|like))\s*(you|u)\b/gi,
    /\b(you('re|r)?\s+(worthless|useless|pathetic|ugly|fat|stupid|dumb))\b/gi,
    /\b(kill|hurt)\s*yourself\b/gi,
    /\b(you\s+should\s+(die|kill\s+yourself|end\s+it))\b/gi,
    /\b(everyone\s+hates\s+you)\b/gi,
  ],
  hate_speech: [
    /\b(nigger|nigga|chink|spic|kike|faggot|tranny|dyke)\b/gi,
    /\b(go\s+back\s+to)\s*(your\s+country|where\s+you\s+came\s+from|africa|mexico|china)\b/gi,
  ],
  pressure_tactics: [
    /\b(if\s+you\s+(don't|don't|won't))\s*,?\s*(then|i('ll|'m\s+gonna)?)\b/gi,
    /\b(you\s+owe\s+me)\b/gi,
    /\b(after\s+all\s+i('ve)?\s+done\s+for\s+you)\b/gi,
    /\b(give\s+me\s+(a|another)\s+chance\s+or)\b/gi,
  ],
};

// Severity weights for different pattern types
const SEVERITY_WEIGHTS = {
  direct_threats: 1.0,
  stalking_behavior: 0.95,
  blackmail_coercion: 0.9,
  sexual_harassment: 0.85,
  hate_speech: 0.85,
  manipulation: 0.8,
  pressure_tactics: 0.6,
};

// Risk thresholds
const THRESHOLDS = {
  auto_flag: 0.5,
  auto_block: 0.8,
  immediate_review: 0.9,
  escalate_to_authorities: 0.95,
};

export interface HarassmentDetectionResult {
  id?: string;
  content: string;
  senderId: string;
  recipientId?: string;
  messageId?: string;
  conversationId?: string;
  contentType: 'message' | 'profile_bio' | 'photo_caption' | 'prompt_response';

  // Scores
  harassmentScore: number;
  threatScore: number;
  hateSpeechScore: number;
  sexualHarassmentScore: number;
  manipulationScore: number;
  overallRiskScore: number;

  // Flags
  isFlagged: boolean;
  requiresReview: boolean;
  autoBlocked: boolean;

  // Detected patterns
  detectedPatterns: {
    category: string;
    matches: string[];
    severity: number;
  }[];
  confidenceScores: Record<string, number>;
  aiExplanation: string;

  // Recommended action
  recommendedAction: 'none' | 'warn' | 'flag' | 'block' | 'escalate';
}

export interface ConversationRiskProfile {
  conversationId: string;
  participants: string[];
  messageCount: number;
  flaggedMessageCount: number;
  averageRiskScore: number;
  highestRiskScore: number;
  riskTrend: 'increasing' | 'stable' | 'decreasing';
  recommendations: string[];
}

class HarassmentDetectionService {
  /**
   * Analyze text content for harassment patterns
   */
  async analyzeContent(
    content: string,
    senderId: string,
    options: {
      recipientId?: string;
      messageId?: string;
      conversationId?: string;
      contentType?: 'message' | 'profile_bio' | 'photo_caption' | 'prompt_response';
      saveResult?: boolean;
    } = {}
  ): Promise<HarassmentDetectionResult> {
    const {
      recipientId,
      messageId,
      conversationId,
      contentType = 'message',
      saveResult = true,
    } = options;

    logger.info(`Analyzing content for harassment`, {
      senderId,
      contentType,
      contentLength: content.length,
    });

    // Normalize content for analysis
    const normalizedContent = this.normalizeText(content);

    // Detect patterns in each category
    const detectedPatterns: HarassmentDetectionResult['detectedPatterns'] = [];
    const categoryScores: Record<string, number> = {};

    for (const [category, patterns] of Object.entries(HARASSMENT_PATTERNS)) {
      const matches: string[] = [];

      for (const pattern of patterns) {
        const found = normalizedContent.match(pattern);
        if (found) {
          matches.push(...found);
        }
      }

      if (matches.length > 0) {
        const severity = SEVERITY_WEIGHTS[category as keyof typeof SEVERITY_WEIGHTS] || 0.5;
        detectedPatterns.push({
          category,
          matches: [...new Set(matches)], // Deduplicate
          severity,
        });
        categoryScores[category] = Math.min(matches.length * 0.2 * severity, severity);
      } else {
        categoryScores[category] = 0;
      }
    }

    // Calculate individual scores
    const threatScore = Math.max(
      categoryScores.direct_threats || 0,
      categoryScores.stalking_behavior || 0
    );
    const hateSpeechScore = categoryScores.hate_speech || 0;
    const sexualHarassmentScore = categoryScores.sexual_harassment || 0;
    const manipulationScore = Math.max(
      categoryScores.manipulation || 0,
      categoryScores.blackmail_coercion || 0,
      categoryScores.pressure_tactics || 0
    );
    const harassmentScore = Math.max(
      threatScore,
      sexualHarassmentScore,
      manipulationScore * 0.9
    );

    // Calculate overall risk score (weighted average with max emphasis)
    const scores = [threatScore, hateSpeechScore, sexualHarassmentScore, manipulationScore];
    const maxScore = Math.max(...scores);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const overallRiskScore = Math.min(maxScore * 0.7 + avgScore * 0.3, 1.0);

    // Determine flags and actions
    const isFlagged = overallRiskScore >= THRESHOLDS.auto_flag;
    const requiresReview = overallRiskScore >= THRESHOLDS.immediate_review;
    const autoBlocked = overallRiskScore >= THRESHOLDS.auto_block;

    // Determine recommended action
    let recommendedAction: HarassmentDetectionResult['recommendedAction'] = 'none';
    if (overallRiskScore >= THRESHOLDS.escalate_to_authorities) {
      recommendedAction = 'escalate';
    } else if (overallRiskScore >= THRESHOLDS.auto_block) {
      recommendedAction = 'block';
    } else if (overallRiskScore >= THRESHOLDS.immediate_review) {
      recommendedAction = 'flag';
    } else if (overallRiskScore >= THRESHOLDS.auto_flag) {
      recommendedAction = 'warn';
    }

    // Generate AI explanation
    const aiExplanation = this.generateExplanation(detectedPatterns, overallRiskScore);

    const result: HarassmentDetectionResult = {
      content,
      senderId,
      recipientId,
      messageId,
      conversationId,
      contentType,
      harassmentScore,
      threatScore,
      hateSpeechScore,
      sexualHarassmentScore,
      manipulationScore,
      overallRiskScore,
      isFlagged,
      requiresReview,
      autoBlocked,
      detectedPatterns,
      confidenceScores: categoryScores,
      aiExplanation,
      recommendedAction,
    };

    // Save to database if requested
    if (saveResult && isFlagged) {
      result.id = await this.saveDetectionResult(result);
    }

    // Log high-risk detections
    if (overallRiskScore >= THRESHOLDS.immediate_review) {
      logger.warn(`HIGH RISK CONTENT DETECTED`, {
        senderId,
        recipientId,
        overallRiskScore,
        detectedCategories: detectedPatterns.map(p => p.category),
        recommendedAction,
      });
    }

    return result;
  }

  /**
   * Analyze a batch of messages (e.g., for conversation history)
   */
  async analyzeConversation(
    messages: Array<{
      id: string;
      content: string;
      senderId: string;
      recipientId: string;
      createdAt: Date;
    }>,
    conversationId: string
  ): Promise<ConversationRiskProfile> {
    const participants = [...new Set(messages.flatMap(m => [m.senderId, m.recipientId]))];
    const results: HarassmentDetectionResult[] = [];

    for (const message of messages) {
      const result = await this.analyzeContent(message.content, message.senderId, {
        recipientId: message.recipientId,
        messageId: message.id,
        conversationId,
        saveResult: false,
      });
      results.push(result);
    }

    const flaggedMessages = results.filter(r => r.isFlagged);
    const riskScores = results.map(r => r.overallRiskScore);
    const averageRiskScore = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
    const highestRiskScore = Math.max(...riskScores);

    // Determine risk trend (compare first half to second half)
    const midpoint = Math.floor(riskScores.length / 2);
    const firstHalfAvg = riskScores.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
    const secondHalfAvg = riskScores.slice(midpoint).reduce((a, b) => a + b, 0) / (riskScores.length - midpoint);

    let riskTrend: ConversationRiskProfile['riskTrend'] = 'stable';
    if (secondHalfAvg > firstHalfAvg + 0.1) {
      riskTrend = 'increasing';
    } else if (secondHalfAvg < firstHalfAvg - 0.1) {
      riskTrend = 'decreasing';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskTrend === 'increasing') {
      recommendations.push('Risk is escalating - consider proactive intervention');
    }
    if (highestRiskScore >= THRESHOLDS.auto_block) {
      recommendations.push('High-severity content detected - immediate review required');
    }
    if (flaggedMessages.length > 3) {
      recommendations.push('Multiple flagged messages - pattern of concerning behavior');
    }

    return {
      conversationId,
      participants,
      messageCount: messages.length,
      flaggedMessageCount: flaggedMessages.length,
      averageRiskScore,
      highestRiskScore,
      riskTrend,
      recommendations,
    };
  }

  /**
   * Get user's harassment history
   */
  async getUserHarassmentHistory(
    userId: string,
    options: { limit?: number; onlyFlagged?: boolean } = {}
  ): Promise<{
    totalDetections: number;
    flaggedCount: number;
    averageRiskScore: number;
    categoryCounts: Record<string, number>;
    recentDetections: any[];
  }> {
    const { limit = 100, onlyFlagged = false } = options;

    let query = db('harassment_detection_results')
      .where('sender_id', userId)
      .orderBy('created_at', 'desc');

    if (onlyFlagged) {
      query = query.where('is_flagged', true);
    }

    const detections = await query.limit(limit);

    const flaggedCount = detections.filter(d => d.is_flagged).length;
    const riskScores = detections.map(d => d.overall_risk_score);
    const averageRiskScore = riskScores.length > 0
      ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length
      : 0;

    // Count categories
    const categoryCounts: Record<string, number> = {};
    for (const detection of detections) {
      if (detection.detected_patterns) {
        const patterns = typeof detection.detected_patterns === 'string'
          ? JSON.parse(detection.detected_patterns)
          : detection.detected_patterns;
        for (const pattern of patterns) {
          categoryCounts[pattern.category] = (categoryCounts[pattern.category] || 0) + 1;
        }
      }
    }

    return {
      totalDetections: detections.length,
      flaggedCount,
      averageRiskScore,
      categoryCounts,
      recentDetections: detections.slice(0, 10),
    };
  }

  /**
   * Check if user should be auto-blocked or warned
   */
  async checkUserRiskStatus(userId: string): Promise<{
    shouldBlock: boolean;
    shouldWarn: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    reason?: string;
  }> {
    const history = await this.getUserHarassmentHistory(userId, { limit: 50 });

    // Critical: Multiple high-severity detections
    if (history.flaggedCount >= 5) {
      return {
        shouldBlock: true,
        shouldWarn: false,
        riskLevel: 'critical',
        reason: `User has ${history.flaggedCount} flagged harassment detections`,
      };
    }

    // High: Several concerning behaviors
    if (history.flaggedCount >= 3 || history.averageRiskScore >= 0.6) {
      return {
        shouldBlock: false,
        shouldWarn: true,
        riskLevel: 'high',
        reason: `User shows pattern of concerning behavior (${history.flaggedCount} flags, avg score: ${history.averageRiskScore.toFixed(2)})`,
      };
    }

    // Medium: Some issues
    if (history.flaggedCount >= 1 || history.averageRiskScore >= 0.4) {
      return {
        shouldBlock: false,
        shouldWarn: true,
        riskLevel: 'medium',
        reason: 'User has some flagged content',
      };
    }

    return {
      shouldBlock: false,
      shouldWarn: false,
      riskLevel: 'low',
    };
  }

  /**
   * Update user safety score based on harassment detections
   */
  async updateUserSafetyScore(userId: string): Promise<void> {
    const history = await this.getUserHarassmentHistory(userId);

    // Calculate harassment risk score (0-100 scale, inverted for safety)
    let harassmentRiskScore = Math.min(history.averageRiskScore * 100, 100);

    // Get existing safety score or create new one
    const existing = await db('user_safety_scores').where('user_id', userId).first();

    const safetyData = {
      user_id: userId,
      harassment_risk_score: harassmentRiskScore,
      harassment_detections: history.totalDetections,
      is_flagged: history.flaggedCount >= 3,
      is_under_review: history.flaggedCount >= 5,
      last_calculated_at: new Date(),
      updated_at: new Date(),
    };

    if (existing) {
      await db('user_safety_scores').where('user_id', userId).update(safetyData);
    } else {
      await db('user_safety_scores').insert({
        ...safetyData,
        overall_safety_score: 100 - harassmentRiskScore,
        created_at: new Date(),
      });
    }
  }

  /**
   * Get pending reviews for moderators
   */
  async getPendingReviews(options: {
    limit?: number;
    minRiskScore?: number;
    status?: string;
  } = {}): Promise<any[]> {
    const { limit = 50, minRiskScore = 0.5, status = 'pending' } = options;

    return db('harassment_detection_results')
      .where('requires_review', true)
      .where('review_status', status)
      .where('overall_risk_score', '>=', minRiskScore)
      .orderBy('overall_risk_score', 'desc')
      .orderBy('created_at', 'asc')
      .limit(limit);
  }

  /**
   * Review and resolve a detection
   */
  async reviewDetection(
    detectionId: string,
    reviewerId: string,
    decision: {
      status: 'confirmed' | 'dismissed' | 'escalated';
      action?: 'none' | 'warning_sent' | 'message_hidden' | 'user_warned' | 'user_suspended' | 'user_banned' | 'escalated_to_law_enforcement';
      notes?: string;
    }
  ): Promise<void> {
    await db('harassment_detection_results')
      .where('id', detectionId)
      .update({
        review_status: decision.status,
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        reviewer_notes: decision.notes,
        action_taken: decision.action,
        updated_at: new Date(),
      });

    // Log moderator action
    const detection = await db('harassment_detection_results').where('id', detectionId).first();
    if (detection) {
      await db('moderator_action_logs').insert({
        moderator_id: reviewerId,
        target_user_id: detection.sender_id,
        content_id: detectionId,
        action_type: 'report_reviewed',
        action_details: JSON.stringify(decision),
        created_at: new Date(),
      });

      // Update user safety score
      await this.updateUserSafetyScore(detection.sender_id);
    }
  }

  // Private helper methods

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[0-9]/g, (match) => {
        // Common leetspeak substitutions
        const leetMap: Record<string, string> = {
          '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
        };
        return leetMap[match] || match;
      })
      .replace(/\$/g, 's')
      .replace(/@/g, 'a')
      .replace(/\+/g, 't')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generateExplanation(
    patterns: HarassmentDetectionResult['detectedPatterns'],
    riskScore: number
  ): string {
    if (patterns.length === 0) {
      return 'No concerning patterns detected in this content.';
    }

    const categories = patterns.map(p => p.category.replace(/_/g, ' '));
    const uniqueCategories = [...new Set(categories)];

    let explanation = `Detected ${uniqueCategories.length} category(ies) of concerning content: ${uniqueCategories.join(', ')}. `;

    if (riskScore >= THRESHOLDS.escalate_to_authorities) {
      explanation += 'This content contains severe threats or harassment that may warrant law enforcement involvement.';
    } else if (riskScore >= THRESHOLDS.auto_block) {
      explanation += 'This content is highly concerning and warrants immediate action.';
    } else if (riskScore >= THRESHOLDS.immediate_review) {
      explanation += 'This content requires manual review by a moderator.';
    } else if (riskScore >= THRESHOLDS.auto_flag) {
      explanation += 'This content has been flagged for potential policy violations.';
    }

    return explanation;
  }

  private async saveDetectionResult(result: HarassmentDetectionResult): Promise<string> {
    const [inserted] = await db('harassment_detection_results')
      .insert({
        message_id: result.messageId,
        conversation_id: result.conversationId,
        sender_id: result.senderId,
        recipient_id: result.recipientId,
        content: result.content,
        content_type: result.contentType,
        harassment_score: result.harassmentScore,
        threat_score: result.threatScore,
        hate_speech_score: result.hateSpeechScore,
        sexual_harassment_score: result.sexualHarassmentScore,
        manipulation_score: result.manipulationScore,
        overall_risk_score: result.overallRiskScore,
        is_flagged: result.isFlagged,
        requires_review: result.requiresReview,
        auto_blocked: result.autoBlocked,
        detected_patterns: JSON.stringify(result.detectedPatterns),
        confidence_scores: JSON.stringify(result.confidenceScores),
        ai_explanation: result.aiExplanation,
        review_status: result.requiresReview ? 'pending' : 'reviewed',
      })
      .returning('id');

    return inserted.id;
  }
}

export const harassmentDetectionService = new HarassmentDetectionService();
export default harassmentDetectionService;
