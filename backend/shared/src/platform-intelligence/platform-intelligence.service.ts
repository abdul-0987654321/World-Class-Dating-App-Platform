/**
 * Platform Intelligence Service
 * Wires the AI configuration to actual service APIs
 */

import {
  PLATFORM_INTELLIGENCE,
  USER_SUPPORT_AI,
  TRUST_SAFETY_AI,
  ADMIN_PLATFORM_AI,
  DIAGNOSIS_OPS_AI,
  GLOBALIZATION_AI,
  UserSupportContext,
  ModerationCase,
  ModerationAction,
  ReportCategory,
  IncidentSeverity,
  IssueScope,
} from './platform-ai-config';

// ============================================================================
// USER SUPPORT SERVICE
// ============================================================================

export class UserSupportService {
  /**
   * Get contextual help for a user based on their situation
   */
  async getContextualHelp(context: UserSupportContext, issue: string): Promise<{
    title: string;
    content: string;
    steps: string[];
    resolution: string;
  }> {
    const flows = USER_SUPPORT_AI.troubleshootingFlows;

    // Match issue to troubleshooting flow
    if (issue.includes('match') || issue.includes('discover')) {
      return {
        title: flows.noMatches.title,
        content: 'Let\'s figure out why you\'re not getting matches.',
        steps: flows.noMatches.steps.map(s => s.question || s.suggestion || ''),
        resolution: flows.noMatches.resolution,
      };
    }

    if (issue.includes('message') || issue.includes('chat')) {
      return {
        title: flows.missingMessages.title,
        content: 'Let\'s check why messages aren\'t appearing.',
        steps: flows.missingMessages.steps.map(s => s.question || s.info || s.action || ''),
        resolution: flows.missingMessages.resolution,
      };
    }

    if (issue.includes('subscription') || issue.includes('payment') || issue.includes('billing')) {
      return {
        title: flows.subscriptionIssue.title,
        content: 'Let\'s resolve your subscription issue.',
        steps: flows.subscriptionIssue.steps.map(s => s.action || s.info || ''),
        resolution: flows.subscriptionIssue.resolution,
      };
    }

    if (issue.includes('report') || issue.includes('block')) {
      return {
        title: flows.reportingUser.title,
        content: 'Here\'s how to report someone.',
        steps: flows.reportingUser.steps.map(s => s.action || s.info || ''),
        resolution: flows.reportingUser.assurance,
      };
    }

    // Default help
    return {
      title: 'Need Help?',
      content: 'Our support team is here to help.',
      steps: ['Describe your issue', 'Check our FAQ', 'Contact support if needed'],
      resolution: 'Visit our Help Center for more information',
    };
  }

  /**
   * Get feature explanation for user education
   */
  getFeatureExplanation(feature: 'matching' | 'messaging' | 'verification' | 'privacy'): {
    title: string;
    content: string;
    tips?: string[];
    controls?: string[];
  } {
    const explanation = USER_SUPPORT_AI.featureExplanations[feature];
    return {
      title: explanation.title,
      content: explanation.content,
      tips: 'tips' in explanation ? explanation.tips : undefined,
      controls: 'controls' in explanation ? explanation.controls : undefined,
    };
  }

  /**
   * Get subscription tier comparison
   */
  getSubscriptionComparison(): Record<string, string> {
    return USER_SUPPORT_AI.featureExplanations.matching.freeVsPaid;
  }
}

// ============================================================================
// TRUST & SAFETY SERVICE
// ============================================================================

export class TrustSafetyService {
  /**
   * Triage a new report and assign priority
   */
  triageReport(report: {
    category: ReportCategory;
    description: string;
    reportedUserPriorViolations: number;
  }): {
    priority: number;
    suggestedAction: string;
    reviewTimeTarget: string;
    requiresHumanReview: boolean;
  } {
    const categoryConfig = TRUST_SAFETY_AI.reportCategories[report.category];

    // Increase priority for repeat offenders
    let priority = categoryConfig.priority;
    if (report.reportedUserPriorViolations > 0) {
      priority = Math.min(5, priority + 1);
    }

    return {
      priority,
      suggestedAction: categoryConfig.autoAction,
      reviewTimeTarget: categoryConfig.reviewTime,
      requiresHumanReview: categoryConfig.autoAction === 'none' ||
                           categoryConfig.autoAction === 'immediate-suspension',
    };
  }

  /**
   * Analyze signals for abuse pattern detection
   */
  detectAbusePattern(signals: string[]): {
    patternType: string | null;
    confidence: string;
    matchedSignals: string[];
  } {
    const patterns = TRUST_SAFETY_AI.abusePatterns;

    for (const [patternType, config] of Object.entries(patterns)) {
      const matchedSignals = config.signals.filter(s =>
        signals.some(signal => signal.toLowerCase().includes(s.toLowerCase()))
      );

      if (matchedSignals.length >= 2) {
        return {
          patternType,
          confidence: config.confidence,
          matchedSignals,
        };
      }
    }

    return {
      patternType: null,
      confidence: 'low',
      matchedSignals: [],
    };
  }

  /**
   * Recommend moderation action based on case
   */
  recommendAction(moderationCase: {
    isFirstOffense: boolean;
    severity: 'minor' | 'moderate' | 'severe';
    category: ReportCategory;
  }): {
    action: ModerationAction;
    duration?: string;
    message: string;
    requiresHumanApproval: boolean;
  } {
    const matrix = TRUST_SAFETY_AI.actionMatrix;
    const offenseType = moderationCase.isFirstOffense ? 'firstOffense' : 'repeatOffense';
    const actionConfig = matrix[offenseType][moderationCase.severity];

    // Check if this triggers escalation
    const needsEscalation = TRUST_SAFETY_AI.actionMatrix.escalationTriggers.some(
      trigger => moderationCase.category.includes(trigger.toLowerCase().replace(/ /g, '-'))
    );

    if (needsEscalation) {
      return {
        action: 'escalation',
        message: 'This case requires immediate escalation to Trust & Safety leadership.',
        requiresHumanApproval: true,
      };
    }

    return {
      action: actionConfig.action as ModerationAction,
      duration: 'duration' in actionConfig ? actionConfig.duration : undefined,
      message: 'message' in actionConfig ? actionConfig.message : 'Action taken.',
      requiresHumanApproval: 'requiresHumanApproval' in actionConfig
        ? actionConfig.requiresHumanApproval
        : false,
    };
  }

  /**
   * Check appeal eligibility
   */
  checkAppealEligibility(action: ModerationAction): {
    canAppeal: boolean;
    reason?: string;
  } {
    const config = TRUST_SAFETY_AI.appealConfig.eligibility;

    if (config.canAppeal.includes(action)) {
      return { canAppeal: true };
    }

    if (config.cannotAppeal.includes(action)) {
      return {
        canAppeal: false,
        reason: 'This action type cannot be appealed.'
      };
    }

    return { canAppeal: false, reason: 'Unknown action type.' };
  }
}

// ============================================================================
// ADMIN PLATFORM SERVICE
// ============================================================================

export class AdminPlatformService {
  /**
   * Classify an issue by scope and severity
   */
  classifyIssue(issue: {
    affectedUsers: number;
    totalUsers: number;
    region?: string;
    serviceDown?: boolean;
  }): {
    scope: IssueScope;
    severity: IncidentSeverity;
    responseTeam: string;
    escalationPath: string[];
  } {
    const affectedPercentage = (issue.affectedUsers / issue.totalUsers) * 100;

    let scope: IssueScope;
    let severity: IncidentSeverity;

    if (issue.serviceDown) {
      scope = 'system';
      severity = 'P0';
    } else if (affectedPercentage > 50) {
      scope = 'system';
      severity = 'P1';
    } else if (issue.region && affectedPercentage > 5) {
      scope = 'regional';
      severity = 'P2';
    } else if (affectedPercentage > 1) {
      scope = 'regional';
      severity = 'P3';
    } else {
      scope = 'user';
      severity = 'P4';
    }

    const severityConfig = ADMIN_PLATFORM_AI.severityLevels[severity];

    return {
      scope,
      severity,
      responseTeam: ADMIN_PLATFORM_AI.issueClassification[scope].response,
      escalationPath: severityConfig.escalation,
    };
  }

  /**
   * Get health metrics thresholds
   */
  getHealthMetrics(): typeof ADMIN_PLATFORM_AI.healthMetrics {
    return ADMIN_PLATFORM_AI.healthMetrics;
  }

  /**
   * Assess configuration change risk
   */
  assessChangeRisk(change: {
    affectedUsersPercentage: number;
    hasRollback: boolean;
    dependencyCount: number;
    revenueImpact: boolean;
  }): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    requiredApprovals: string[];
    recommendations: string[];
  } {
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';

    if (change.affectedUsersPercentage > 50 || change.revenueImpact) {
      riskLevel = 'critical';
    } else if (change.affectedUsersPercentage > 20 || !change.hasRollback) {
      riskLevel = 'high';
    } else if (change.dependencyCount > 3) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    const approvals = ADMIN_PLATFORM_AI.changeAssessment.requiredApprovals as Record<string, string[]>;
    const approvalKey = riskLevel === 'critical' ? 'critical' : `${riskLevel}Risk`;

    return {
      riskLevel,
      requiredApprovals: approvals[approvalKey] || ['Engineer'],
      recommendations: [
        ...ADMIN_PLATFORM_AI.changeAssessment.rollbackRequirements.always,
        ...(riskLevel === 'high' || riskLevel === 'critical'
          ? ['Staged rollout recommended', 'Monitor closely for 24h']
          : []),
      ],
    };
  }
}

// ============================================================================
// DIAGNOSIS OPS SERVICE
// ============================================================================

export class DiagnosisOpsService {
  /**
   * Get diagnosis flow for an issue type
   */
  getDiagnosisFlow(issueType: 'missingMatches' | 'messageDeliveryFailure' | 'loginFailure' | 'subscriptionIssue'): {
    name: string;
    correlations: Array<{
      check: string;
      expect: string;
    }>;
    resolutions: Record<string, string>;
  } {
    const flow = DIAGNOSIS_OPS_AI.diagnosisFlows[issueType];
    return {
      name: flow.name,
      correlations: flow.correlations.map(c => ({
        check: c.check,
        expect: c.expect,
      })),
      resolutions: flow.resolutions,
    };
  }

  /**
   * Get self-healing action for a trigger
   */
  getSelfHealingAction(trigger: string): {
    action: string;
    reversible: boolean;
    requiresApproval: string | null;
    type: 'automatic' | 'semi-automatic' | 'manual';
  } | null {
    const actions = DIAGNOSIS_OPS_AI.selfHealingActions;

    // Check automatic actions
    const autoAction = actions.automatic.find(a => a.trigger === trigger);
    if (autoAction) {
      return {
        action: autoAction.action,
        reversible: autoAction.reversible,
        requiresApproval: null,
        type: 'automatic',
      };
    }

    // Check semi-automatic actions
    const semiAction = actions.semiAutomatic.find(a => a.trigger === trigger);
    if (semiAction) {
      return {
        action: semiAction.action,
        reversible: true,
        requiresApproval: semiAction.requiresApproval,
        type: 'semi-automatic',
      };
    }

    // Check manual actions
    const manualAction = actions.manual.find(a => a.trigger === trigger);
    if (manualAction) {
      return {
        action: manualAction.action,
        reversible: false,
        requiresApproval: manualAction.requiresApproval,
        type: 'manual',
      };
    }

    return null;
  }

  /**
   * Get guardrail recommendations
   */
  getGuardrails(): typeof DIAGNOSIS_OPS_AI.guardrails {
    return DIAGNOSIS_OPS_AI.guardrails;
  }
}

// ============================================================================
// GLOBALIZATION SERVICE
// ============================================================================

export class GlobalizationService {
  /**
   * Get regional configuration
   */
  getRegionalConfig(region: 'EU' | 'US' | 'MENA' | 'APAC' | 'LATAM' | 'SSA'): {
    languages: string[];
    legalRequirements: string[];
    paymentMethods: string[];
    safetyFeatures: string[];
  } {
    return GLOBALIZATION_AI.regions[region];
  }

  /**
   * Get compliance requirements for a regulation
   */
  getComplianceRequirements(regulation: 'GDPR' | 'CCPA' | 'ageVerification'): {
    requirements: string[];
    implementation?: Record<string, string>;
    methods?: string[];
  } {
    const config = GLOBALIZATION_AI.compliance[regulation];
    return {
      requirements: config.requirements,
      implementation: 'implementation' in config ? config.implementation : undefined,
      methods: 'methods' in config ? config.methods : undefined,
    };
  }

  /**
   * Check if LGBTQ+ safety mode should be offered
   */
  shouldOfferLgbtqSafetyMode(region: string): boolean {
    const safetyConfig = GLOBALIZATION_AI.safetyAdaptations.lgbtqSafetyMode;
    return safetyConfig.regions.some(r =>
      region.toLowerCase().includes(r.toLowerCase().replace('parts-of-', ''))
    );
  }

  /**
   * Get women's safety features
   */
  getWomensSafetyFeatures(): string[] {
    return GLOBALIZATION_AI.safetyAdaptations.womensSafetyFeatures.features;
  }

  /**
   * Get emergency contacts for a region
   */
  getEmergencyContacts(country: string): string[] {
    const contacts = GLOBALIZATION_AI.safetyAdaptations.emergencyContacts.configuration;
    return contacts[country as keyof typeof contacts] || ['112']; // Default to EU emergency
  }

  /**
   * Get language guidelines
   */
  getLanguageGuidelines(): typeof GLOBALIZATION_AI.languageGuidelines {
    return GLOBALIZATION_AI.languageGuidelines;
  }
}

// ============================================================================
// UNIFIED PLATFORM INTELLIGENCE API
// ============================================================================

export class PlatformIntelligenceAPI {
  public userSupport: UserSupportService;
  public trustSafety: TrustSafetyService;
  public adminPlatform: AdminPlatformService;
  public diagnosisOps: DiagnosisOpsService;
  public globalization: GlobalizationService;

  constructor() {
    this.userSupport = new UserSupportService();
    this.trustSafety = new TrustSafetyService();
    this.adminPlatform = new AdminPlatformService();
    this.diagnosisOps = new DiagnosisOpsService();
    this.globalization = new GlobalizationService();
  }

  /**
   * Get platform version and success conditions
   */
  getInfo(): {
    version: string;
    successConditions: string[];
    coreRules: typeof PLATFORM_INTELLIGENCE.coreRules;
  } {
    return {
      version: PLATFORM_INTELLIGENCE.version,
      successConditions: PLATFORM_INTELLIGENCE.successConditions,
      coreRules: PLATFORM_INTELLIGENCE.coreRules,
    };
  }
}

// Export singleton instance
export const platformIntelligence = new PlatformIntelligenceAPI();
export default platformIntelligence;
