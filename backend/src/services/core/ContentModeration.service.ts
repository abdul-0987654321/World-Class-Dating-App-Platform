/**
 * Content Moderation Service
 * Handles AI-powered content moderation including:
 * - Photo/video content analysis
 * - Text content analysis (bios, messages)
 * - Harassment detection
 * - Scam/fraud detection
 * - Report management
 * - User blocking
 */

import { SafetyRepository } from '../../repositories/Safety.repository';
import { UserRepository } from '../../repositories';
import { logger } from '../../utils/logger';
import {
  UserReport,
  ReportCategory,
  ReportStatus,
  ReportResolution,
  ReportedContentType,
  ContentModerationQueueItem,
  ContentType,
  ModerationStatus,
  UserBlock,
  BlockType,
  ScamIndicator,
  ScamIndicatorType,
  FraudAlert,
  FraudAlertType,
  AccountFlag,
  AccountFlagType,
  ModerationAction,
  ModerationActionType,
  ReportSubmission,
} from '../../models/Safety.model';

interface TextAnalysisResult {
  isAppropriate: boolean;
  confidence: number;
  categories: {
    harassment: number;
    hateSpeech: number;
    sexualContent: number;
    violence: number;
    spam: number;
    scam: number;
    personalInfo: number;
  };
  detectedKeywords: string[];
  suggestedAction: 'allow' | 'review' | 'block';
}

interface ImageAnalysisResult {
  isAppropriate: boolean;
  confidence: number;
  categories: {
    nudity: number;
    violence: number;
    suggestive: number;
    drugs: number;
    weapons: number;
  };
  faceCount: number;
  isProfilePhoto: boolean;
  qualityScore: number;
  suggestedAction: 'allow' | 'review' | 'block';
}

interface ScamDetectionResult {
  isScam: boolean;
  confidence: number;
  indicators: ScamIndicatorType[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: string;
}

export class ContentModerationService {
  private safetyRepo: SafetyRepository;
  private userRepo: UserRepository;

  // Keyword lists for content filtering
  private readonly SCAM_KEYWORDS = [
    'send money', 'western union', 'wire transfer', 'bitcoin', 'cryptocurrency',
    'gift card', 'steam card', 'investment opportunity', 'get rich', 'emergency',
    'hospital', 'stuck', 'loan', 'bank account', 'routing number', 'ssn',
    'cash app', 'venmo', 'zelle', 'paypal me', 'military deployment',
    'inheritance', 'lottery', 'prince', 'widow', 'orphan', 'dying',
  ];

  private readonly HARASSMENT_KEYWORDS = [
    'kill', 'hurt', 'rape', 'stalk', 'threaten', 'die', 'murder',
    // Slurs and offensive terms would be added here but excluded for safety
  ];

  private readonly EXPLICIT_KEYWORDS = [
    'nude', 'naked', 'nsfw', 'hookup', 'fwb', 'casual', 'one night',
    // Additional explicit terms would be added here
  ];

  private readonly SOLICITATION_KEYWORDS = [
    'escort', 'pay', 'rate', 'hourly', 'services', 'massage',
    'sugar daddy', 'sugar baby', 'arrangement', 'allowance',
  ];

  constructor(safetyRepo: SafetyRepository, userRepo: UserRepository) {
    this.safetyRepo = safetyRepo;
    this.userRepo = userRepo;
  }

  // ============================================
  // Text Content Moderation
  // ============================================

  /**
   * Analyze text content for appropriateness
   */
  async analyzeTextContent(
    text: string,
    context: 'bio' | 'message' | 'comment' | 'username'
  ): Promise<TextAnalysisResult> {
    const lowerText = text.toLowerCase();

    // Initialize scores
    const categories = {
      harassment: 0,
      hateSpeech: 0,
      sexualContent: 0,
      violence: 0,
      spam: 0,
      scam: 0,
      personalInfo: 0,
    };

    const detectedKeywords: string[] = [];

    // Check for harassment keywords
    for (const keyword of this.HARASSMENT_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        categories.harassment += 0.3;
        detectedKeywords.push(keyword);
      }
    }

    // Check for explicit content
    for (const keyword of this.EXPLICIT_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        categories.sexualContent += 0.2;
        detectedKeywords.push(keyword);
      }
    }

    // Check for scam indicators
    for (const keyword of this.SCAM_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        categories.scam += 0.25;
        detectedKeywords.push(keyword);
      }
    }

    // Check for solicitation
    for (const keyword of this.SOLICITATION_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        categories.sexualContent += 0.15;
        categories.scam += 0.1;
        detectedKeywords.push(keyword);
      }
    }

    // Check for personal info patterns
    if (this.containsPersonalInfo(text)) {
      categories.personalInfo = 0.8;
    }

    // Check for spam patterns
    if (this.isSpamPattern(text)) {
      categories.spam = 0.7;
    }

    // Calculate overall appropriateness
    const maxScore = Math.max(...Object.values(categories));
    const isAppropriate = maxScore < 0.5;
    const confidence = 0.7 + Math.random() * 0.2; // Simulated confidence

    // Determine suggested action
    let suggestedAction: 'allow' | 'review' | 'block' = 'allow';
    if (maxScore >= 0.7) {
      suggestedAction = 'block';
    } else if (maxScore >= 0.4) {
      suggestedAction = 'review';
    }

    return {
      isAppropriate,
      confidence,
      categories,
      detectedKeywords: [...new Set(detectedKeywords)],
      suggestedAction,
    };
  }

  /**
   * Analyze image content for appropriateness
   */
  async analyzeImageContent(
    imageData: Buffer | string,
    context: 'profile_photo' | 'gallery' | 'message'
  ): Promise<ImageAnalysisResult> {
    // In production, this would call an AI service like AWS Rekognition,
    // Google Cloud Vision, or a custom model

    // Simulated analysis
    const categories = {
      nudity: Math.random() * 0.1,
      violence: Math.random() * 0.05,
      suggestive: Math.random() * 0.2,
      drugs: Math.random() * 0.05,
      weapons: Math.random() * 0.05,
    };

    const maxScore = Math.max(...Object.values(categories));
    const isAppropriate = maxScore < 0.5;

    let suggestedAction: 'allow' | 'review' | 'block' = 'allow';
    if (maxScore >= 0.7) {
      suggestedAction = 'block';
    } else if (maxScore >= 0.4) {
      suggestedAction = 'review';
    }

    return {
      isAppropriate,
      confidence: 0.85 + Math.random() * 0.1,
      categories,
      faceCount: 1,
      isProfilePhoto: context === 'profile_photo',
      qualityScore: 0.7 + Math.random() * 0.3,
      suggestedAction,
    };
  }

  /**
   * Moderate content before publishing
   */
  async moderateContent(
    userId: string,
    contentType: ContentType,
    contentId: string,
    content: string | Buffer
  ): Promise<{
    approved: boolean;
    reason?: string;
    queuedForReview: boolean;
  }> {
    let analysis: TextAnalysisResult | ImageAnalysisResult;

    if (contentType === 'photo') {
      analysis = await this.analyzeImageContent(
        content as Buffer,
        'gallery'
      );
    } else {
      analysis = await this.analyzeTextContent(
        content as string,
        contentType as 'bio' | 'message' | 'comment'
      );
    }

    if (analysis.suggestedAction === 'block') {
      // Auto-block and add to moderation queue
      await this.safetyRepo.addToModerationQueue(
        userId,
        contentType,
        contentId,
        analysis
      );

      return {
        approved: false,
        reason: 'Content violates community guidelines',
        queuedForReview: true,
      };
    }

    if (analysis.suggestedAction === 'review') {
      // Allow but queue for review
      await this.safetyRepo.addToModerationQueue(
        userId,
        contentType,
        contentId,
        analysis
      );

      return {
        approved: true,
        queuedForReview: true,
      };
    }

    return {
      approved: true,
      queuedForReview: false,
    };
  }

  // ============================================
  // Scam & Fraud Detection
  // ============================================

  /**
   * Analyze message for scam indicators
   */
  async detectScamInMessage(
    senderId: string,
    recipientId: string,
    messageText: string,
    messageId: string
  ): Promise<ScamDetectionResult> {
    const indicators: ScamIndicatorType[] = [];
    let confidence = 0;

    const lowerText = messageText.toLowerCase();

    // Check for money-related keywords
    if (this.SCAM_KEYWORDS.some(kw => lowerText.includes(kw))) {
      indicators.push('money_request');
      confidence += 0.3;
    }

    // Check for external links
    if (this.containsExternalLink(messageText)) {
      indicators.push('external_link');
      confidence += 0.2;
    }

    // Check for crypto mentions
    if (/bitcoin|ethereum|crypto|btc|eth|usdt/i.test(messageText)) {
      indicators.push('crypto_mention');
      confidence += 0.25;
    }

    // Check for gift card mentions
    if (/gift\s*card|steam\s*card|itunes|google\s*play/i.test(messageText)) {
      indicators.push('gift_card_mention');
      confidence += 0.35;
    }

    // Check for wire transfer mentions
    if (/wire\s*transfer|western\s*union|moneygram/i.test(messageText)) {
      indicators.push('wire_transfer_mention');
      confidence += 0.4;
    }

    // Check for sob stories
    if (this.containsSobStory(lowerText)) {
      indicators.push('sob_story');
      confidence += 0.2;
    }

    // Check for investment opportunities
    if (/invest|opportunity|guaranteed\s*return|profit|trading/i.test(messageText)) {
      indicators.push('investment_opportunity');
      confidence += 0.25;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (confidence >= 0.7) riskLevel = 'critical';
    else if (confidence >= 0.5) riskLevel = 'high';
    else if (confidence >= 0.3) riskLevel = 'medium';

    const isScam = confidence >= 0.5;

    // Record indicators if detected
    if (indicators.length > 0) {
      for (const indicator of indicators) {
        await this.safetyRepo.createScamIndicator(senderId, indicator, {
          contentExcerpt: messageText.substring(0, 200),
          messageId,
          confidenceScore: confidence,
        });
      }
    }

    // Create fraud alert for high-risk cases
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await this.safetyRepo.createFraudAlert(
        recipientId,
        'potential_scam',
        `Potential scam detected in conversation. Risk level: ${riskLevel}`,
        { senderId, indicators, messageId }
      );
    }

    return {
      isScam,
      confidence,
      indicators,
      riskLevel,
      suggestedAction: isScam ? 'Show warning to recipient' : 'Allow message',
    };
  }

  /**
   * Analyze user profile for fraud indicators
   */
  async analyzeProfileForFraud(userId: string): Promise<{
    isSuspicious: boolean;
    riskScore: number;
    indicators: string[];
    suggestedAction: string;
  }> {
    const indicators: string[] = [];
    let riskScore = 0;

    // Get user data
    const user = await this.userRepo.findById(userId);
    if (!user) {
      return {
        isSuspicious: false,
        riskScore: 0,
        indicators: [],
        suggestedAction: 'none',
      };
    }

    // Check verification status
    if (!user.email_verified) {
      indicators.push('email_not_verified');
      riskScore += 0.1;
    }

    if (!user.phone_verified) {
      indicators.push('phone_not_verified');
      riskScore += 0.1;
    }

    // Check account age
    const accountAge = Date.now() - new Date(user.created_at).getTime();
    const accountAgeDays = accountAge / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 1) {
      indicators.push('very_new_account');
      riskScore += 0.2;
    } else if (accountAgeDays < 7) {
      indicators.push('new_account');
      riskScore += 0.1;
    }

    // Check for multiple reports
    const reportCount = await this.safetyRepo.getReportCountForUser(userId);
    if (reportCount >= 3) {
      indicators.push('multiple_reports');
      riskScore += 0.3;
    }

    // Check for active flags
    const flags = await this.safetyRepo.getActiveAccountFlags(userId);
    for (const flag of flags) {
      indicators.push(`flag_${flag.flag_type}`);
      riskScore += 0.2;
    }

    const isSuspicious = riskScore >= 0.4;

    return {
      isSuspicious,
      riskScore: Math.min(riskScore, 1),
      indicators,
      suggestedAction: isSuspicious
        ? 'Review account and consider verification requirement'
        : 'No action needed',
    };
  }

  // ============================================
  // User Reports
  // ============================================

  /**
   * Submit a user report
   */
  async submitReport(submission: ReportSubmission): Promise<UserReport> {
    const { reporterId, reportedUserId, category, description, evidence, contentId, contentType } = submission;

    // Validate users exist
    const [reporter, reported] = await Promise.all([
      this.userRepo.findById(reporterId),
      this.userRepo.findById(reportedUserId),
    ]);

    if (!reporter || !reported) {
      throw new Error('Invalid user IDs');
    }

    // Create the report
    const report = await this.safetyRepo.createReport(
      reporterId,
      reportedUserId,
      category,
      { description, evidence, contentId, contentType }
    );

    // Check if reported user has multiple reports
    const reportCount = await this.safetyRepo.getReportCountForUser(reportedUserId);

    if (reportCount >= 3) {
      // Flag account for review
      await this.safetyRepo.createAccountFlag(
        reportedUserId,
        'multiple_reports',
        `User has received ${reportCount} reports`,
        { latestReportId: report.id }
      );
    }

    // Auto-block the reported user for the reporter
    await this.blockUser(reporterId, reportedUserId, 'full', 'Reported for ' + category);

    logger.info(`Report submitted: ${report.id} - ${category}`);

    return report;
  }

  /**
   * Process a report (for moderators)
   */
  async processReport(
    reportId: string,
    moderatorId: string,
    status: ReportStatus,
    resolution?: ReportResolution,
    notes?: string
  ): Promise<UserReport> {
    const report = await this.safetyRepo.getReport(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const updatedReport = await this.safetyRepo.updateReportStatus(
      reportId,
      status,
      { resolution, reviewedBy: moderatorId, reviewNotes: notes }
    );

    // Apply resolution action
    if (resolution && status === 'resolved') {
      await this.applyReportResolution(report.reported_user_id, resolution, reportId, moderatorId);
    }

    return updatedReport;
  }

  /**
   * Apply resolution action from report
   */
  private async applyReportResolution(
    userId: string,
    resolution: ReportResolution,
    reportId: string,
    moderatorId: string
  ): Promise<void> {
    switch (resolution) {
      case 'warning':
        await this.safetyRepo.createModerationAction(userId, 'warning', {
          moderatorId,
          reason: 'Community guidelines violation',
          relatedReports: [reportId],
        });
        break;

      case 'content_removed':
        await this.safetyRepo.createModerationAction(userId, 'content_removal', {
          moderatorId,
          reason: 'Inappropriate content',
          relatedReports: [reportId],
        });
        break;

      case 'account_suspended':
        const suspensionEnd = new Date();
        suspensionEnd.setDate(suspensionEnd.getDate() + 7); // 7-day suspension

        await this.safetyRepo.createModerationAction(userId, 'temporary_suspension', {
          moderatorId,
          reason: 'Repeated violations',
          relatedReports: [reportId],
          expiresAt: suspensionEnd,
        });

        await this.userRepo.updateStatus(userId, { is_active: false });
        break;

      case 'account_banned':
        await this.safetyRepo.createModerationAction(userId, 'permanent_ban', {
          moderatorId,
          reason: 'Severe or repeated violations',
          relatedReports: [reportId],
        });

        await this.userRepo.banUser(userId);
        break;
    }
  }

  // ============================================
  // User Blocking
  // ============================================

  /**
   * Block a user
   */
  async blockUser(
    blockerId: string,
    blockedId: string,
    blockType: BlockType = 'full',
    reason?: string
  ): Promise<UserBlock> {
    // Check if already blocked
    const isBlocked = await this.safetyRepo.isUserBlocked(blockerId, blockedId);
    if (isBlocked) {
      throw new Error('User is already blocked');
    }

    const block = await this.safetyRepo.createBlock(
      blockerId,
      blockedId,
      blockType,
      reason
    );

    logger.info(`User ${blockerId} blocked user ${blockedId}`);

    return block;
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.safetyRepo.removeBlock(blockerId, blockedId);
    logger.info(`User ${blockerId} unblocked user ${blockedId}`);
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId: string): Promise<UserBlock[]> {
    return this.safetyRepo.getUserBlocks(userId);
  }

  /**
   * Check if interaction is allowed (not blocked)
   */
  async canInteract(userId1: string, userId2: string): Promise<boolean> {
    const [blocked1, blocked2] = await Promise.all([
      this.safetyRepo.isUserBlocked(userId1, userId2),
      this.safetyRepo.isUserBlocked(userId2, userId1),
    ]);

    return !blocked1 && !blocked2;
  }

  // ============================================
  // Bot Detection
  // ============================================

  /**
   * Update bot detection score based on behavior
   */
  async updateBotScore(
    userId: string,
    behaviorData: {
      typingSpeed?: number;
      swipePattern?: number[];
      messageTemplates?: string[];
      sessionDuration?: number;
    }
  ): Promise<number> {
    const score = await this.safetyRepo.getOrCreateBotDetectionScore(userId);

    // Calculate new signals
    const behavioralSignals: Record<string, any> = {};
    const interactionSignals: Record<string, any> = {};

    // Typing speed analysis (very fast or very consistent = suspicious)
    if (behaviorData.typingSpeed) {
      behavioralSignals.typingSpeed = behaviorData.typingSpeed;
      if (behaviorData.typingSpeed > 500) {
        // > 500 chars/min is suspicious
        interactionSignals.typingSpeedScore = 0.3;
      }
    }

    // Swipe pattern analysis (very regular patterns = suspicious)
    if (behaviorData.swipePattern && behaviorData.swipePattern.length > 10) {
      const entropy = this.calculatePatternEntropy(behaviorData.swipePattern);
      interactionSignals.swipePatternEntropy = entropy;
      if (entropy < 0.5) {
        // Low entropy = predictable pattern
        interactionSignals.swipePatternScore = 0.4;
      }
    }

    // Message template detection
    if (behaviorData.messageTemplates && behaviorData.messageTemplates.length > 5) {
      const templateScore = this.calculateTemplateScore(behaviorData.messageTemplates);
      interactionSignals.messageTemplateScore = templateScore;
    }

    // Calculate overall score
    const signalScores = Object.values(interactionSignals).filter(
      v => typeof v === 'number' && !isNaN(v)
    );
    const avgSignalScore = signalScores.length > 0
      ? signalScores.reduce((a, b) => a + b, 0) / signalScores.length
      : 0;

    const newOverallScore = Math.min(
      (score.overall_score * 0.7 + avgSignalScore * 100 * 0.3),
      100
    );

    await this.safetyRepo.updateBotDetectionScore(userId, {
      overallScore: newOverallScore,
      behavioralSignals,
      interactionSignals,
    });

    // Flag account if score is high
    if (newOverallScore > 70) {
      await this.safetyRepo.createAccountFlag(
        userId,
        'bot_behavior',
        `Bot detection score: ${newOverallScore}`,
        { behavioralSignals, interactionSignals }
      );
    }

    return newOverallScore;
  }

  // ============================================
  // Moderation Actions
  // ============================================

  /**
   * Apply a moderation action to a user
   */
  async applyModerationAction(
    userId: string,
    actionType: ModerationActionType,
    moderatorId: string,
    reason: string,
    expiresAt?: Date
  ): Promise<ModerationAction> {
    const action = await this.safetyRepo.createModerationAction(userId, actionType, {
      moderatorId,
      reason,
      expiresAt,
    });

    // Apply the action
    switch (actionType) {
      case 'temporary_suspension':
        await this.userRepo.updateStatus(userId, { is_active: false });
        break;

      case 'permanent_ban':
        await this.userRepo.banUser(userId);
        break;

      case 'shadow_ban':
        // Shadow ban doesn't change user status, but affects visibility
        await this.safetyRepo.createAccountFlag(
          userId,
          'suspicious_activity',
          'Shadow banned',
          { actionId: action.id }
        );
        break;

      case 'verification_required':
        // Require identity verification
        await this.safetyRepo.createAccountFlag(
          userId,
          'identity_mismatch',
          'Identity verification required',
          { actionId: action.id }
        );
        break;
    }

    return action;
  }

  /**
   * Get active moderation actions for a user
   */
  async getActiveActions(userId: string): Promise<ModerationAction[]> {
    return this.safetyRepo.getActiveModerationActions(userId);
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private containsPersonalInfo(text: string): boolean {
    // Check for phone numbers
    if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) return true;

    // Check for email patterns
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) return true;

    // Check for social media handles with external platform names
    if (/(snapchat|instagram|whatsapp|telegram|kik|snap|ig|insta)\s*[:\-]?\s*@?[\w.]+/i.test(text)) return true;

    // Check for explicit requests to move off platform
    if (/text\s*me|call\s*me|add\s*me|message\s*me\s*on|dm\s*me\s*on/i.test(text)) return true;

    return false;
  }

  private isSpamPattern(text: string): boolean {
    // Check for repeated characters
    if (/(.)\1{4,}/.test(text)) return true;

    // Check for all caps
    if (text.length > 20 && text === text.toUpperCase()) return true;

    // Check for excessive punctuation
    if (/[!?]{3,}/.test(text)) return true;

    // Check for URL patterns
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount >= 2) return true;

    return false;
  }

  private containsExternalLink(text: string): boolean {
    // Match URLs that aren't from the app domain
    const urlPattern = /https?:\/\/(?!flamoral\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    return urlPattern.test(text);
  }

  private containsSobStory(text: string): boolean {
    const sobStoryPatterns = [
      /my\s*(mother|father|parent|child|family)\s*(died|sick|hospital)/i,
      /need\s*money\s*for\s*(medical|surgery|emergency)/i,
      /stuck\s*(in|at)\s*(airport|hospital|foreign)/i,
      /military\s*deployment/i,
      /can't\s*access\s*my\s*(bank|account|money)/i,
    ];

    return sobStoryPatterns.some(pattern => pattern.test(text));
  }

  private calculatePatternEntropy(pattern: number[]): number {
    // Shannon entropy calculation for swipe patterns
    const counts: Record<number, number> = {};
    for (const item of pattern) {
      counts[item] = (counts[item] || 0) + 1;
    }

    const total = pattern.length;
    let entropy = 0;

    for (const count of Object.values(counts)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    // Normalize to 0-1 range
    const maxEntropy = Math.log2(Object.keys(counts).length);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private calculateTemplateScore(messages: string[]): number {
    if (messages.length < 2) return 0;

    // Calculate average similarity between messages
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < messages.length; i++) {
      for (let j = i + 1; j < messages.length; j++) {
        totalSimilarity += this.calculateSimilarity(messages[i], messages[j]);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }
}
