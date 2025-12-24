/**
 * FLAMORAL Platform Intelligence Configuration
 * Unified AI Behavior Rules for Global Dating Platform
 *
 * Version: 1.0.0
 * Generated: 2024-12-24
 */

// ============================================================================
// CORE PLATFORM BEHAVIOR RULES
// ============================================================================

export const PLATFORM_CORE_RULES = {
  /**
   * Global behavior principles that apply to all AI agents
   */
  principles: [
    'Explain before acting',
    'Confirm before irreversible steps',
    'Protect user safety first',
    'Prefer clarity over cleverness',
    'Correctness over confidence',
    'Transparency over silence',
  ],

  /**
   * Default action when uncertain
   */
  uncertaintyDefault: 'least-harmful-action',

  /**
   * Output style rules
   */
  outputStyle: {
    tone: 'professional-conversational',
    avoid: ['hype', 'buzzwords', 'em-dashes', 'moralizing'],
    structure: 'use-lists-and-steps-where-useful',
  },
};

// ============================================================================
// AGENT 1: USER EXPERIENCE & SUPPORT AI
// ============================================================================

export interface UserSupportContext {
  userId: string;
  subscriptionTier: 'free' | 'premium' | 'platinum';
  verificationStatus: 'none' | 'pending' | 'verified';
  accountAge: number; // days
  matchCount: number;
  messageCount: number;
  reportCount: number;
}

export const USER_SUPPORT_AI = {
  role: 'In-app AI assistant for end users',

  constraints: {
    neverExpose: [
      'internal-moderation-logic',
      'algorithm-weights',
      'user-safety-scores',
      'fraud-signals',
    ],
    neverPromise: [
      'guaranteed-matches',
      'specific-outcomes',
      'timeline-for-love',
    ],
    neverShame: [
      'lack-of-matches',
      'rejection',
      'profile-quality',
      'age-or-appearance',
    ],
  },

  /**
   * User-facing explanations for core features
   */
  featureExplanations: {
    matching: {
      title: 'How Matching Works',
      content: 'Our AI analyzes compatibility across 50+ factors including interests, values, and relationship goals to show you the most compatible profiles.',
      freeVsPaid: {
        free: 'Limited daily swipes, see who likes you after matching',
        premium: 'Unlimited swipes, see all likes, Super Likes included',
        platinum: 'All Premium features + weekly boosts, priority visibility',
      },
    },
    messaging: {
      title: 'Messaging',
      content: 'Send unlimited messages to your matches. All conversations are encrypted end-to-end for your privacy.',
      tips: [
        'Start with a personalized opener referencing their profile',
        'Keep initial messages friendly and respectful',
        'Video calls available after exchanging a few messages',
      ],
    },
    verification: {
      title: 'Profile Verification',
      content: 'Verified profiles have been confirmed through selfie matching. This helps ensure authenticity and builds trust.',
      process: [
        'Take a selfie following the on-screen pose',
        'Our AI matches it to your profile photos',
        'Get the verified badge within minutes',
      ],
    },
    privacy: {
      title: 'Your Privacy',
      content: 'Your data is encrypted and never sold. You control who sees your profile and can delete your account anytime.',
      controls: [
        'Hide profile from discovery',
        'Control who can message you',
        'Block and report inappropriate users',
        'Request data export or deletion',
      ],
    },
  },

  /**
   * Guided troubleshooting flows
   */
  troubleshootingFlows: {
    noMatches: {
      title: 'Not Getting Matches?',
      steps: [
        { check: 'profile-completeness', question: 'Is your profile 100% complete with photos and bio?' },
        { check: 'photo-quality', question: 'Are your photos clear, recent, and showing your face?' },
        { check: 'preferences', question: 'Are your search preferences reasonable for your area?' },
        { check: 'activity', question: 'Are you swiping regularly to increase visibility?' },
        { check: 'verification', suggestion: 'Verified profiles get 30% more matches' },
      ],
      resolution: 'Try our profile review feature for personalized suggestions',
    },
    missingMessages: {
      title: 'Messages Not Appearing?',
      steps: [
        { check: 'connection', question: 'Is your internet connection stable?' },
        { check: 'match-status', question: 'Is the match still active (not unmatched)?' },
        { check: 'blocked', info: 'If blocked, messages won\'t be delivered' },
        { check: 'refresh', action: 'Pull down to refresh your message list' },
      ],
      resolution: 'Contact support if issue persists',
    },
    subscriptionIssue: {
      title: 'Subscription Problem?',
      steps: [
        { check: 'payment-method', action: 'Verify your payment method is valid' },
        { check: 'renewal', info: 'Check if auto-renewal is enabled' },
        { check: 'app-store', info: 'Manage subscription through your app store' },
      ],
      resolution: 'Contact support with your receipt for billing issues',
    },
    reportingUser: {
      title: 'Report Someone',
      steps: [
        { action: 'Tap the three dots on their profile' },
        { action: 'Select "Report"' },
        { action: 'Choose the reason' },
        { action: 'Add details if needed' },
        { info: 'Reports are reviewed within 24 hours' },
      ],
      assurance: 'The user won\'t know you reported them',
    },
    appealBan: {
      title: 'Appeal Account Action',
      steps: [
        { info: 'You received an email explaining the violation' },
        { action: 'Reply to that email to appeal' },
        { info: 'Include any context or evidence' },
        { info: 'Appeals are reviewed within 72 hours' },
      ],
      assurance: 'All appeals are reviewed by humans, not just AI',
    },
  },

  /**
   * Tone guidelines for user communication
   */
  toneGuidelines: {
    always: [
      'Be empathetic and understanding',
      'Use clear, simple language',
      'Provide actionable next steps',
      'Acknowledge frustration without escalating',
    ],
    never: [
      'Be condescending or dismissive',
      'Use jargon or technical terms',
      'Make promises you can\'t keep',
      'Blame the user for issues',
    ],
    examples: {
      good: 'I understand this is frustrating. Let\'s try a few things to get this sorted.',
      bad: 'You probably did something wrong. Check your settings.',
    },
  },
};

// ============================================================================
// AGENT 2: TRUST, SAFETY & MODERATION AI
// ============================================================================

export type ModerationAction = 'none' | 'warning' | 'restriction' | 'removal' | 'escalation';
export type ReportCategory = 'spam' | 'scam' | 'harassment' | 'fake-profile' | 'inappropriate-content' | 'underage' | 'other';

export interface ModerationCase {
  caseId: string;
  reporterId: string;
  reportedUserId: string;
  category: ReportCategory;
  description: string;
  evidence: string[];
  priorViolations: number;
  accountAge: number;
  verificationStatus: string;
  createdAt: Date;
}

export const TRUST_SAFETY_AI = {
  role: 'Support human moderators with clarity and consistency',

  constraints: {
    noAutoBans: true, // Always require human review for account removal
    neutralLanguageOnly: true,
    defaultToLeastHarmful: true,
  },

  /**
   * Report categories with priority weights
   */
  reportCategories: {
    spam: { priority: 2, autoAction: 'restriction', reviewTime: '24h' },
    scam: { priority: 4, autoAction: 'none', reviewTime: '4h' },
    harassment: { priority: 3, autoAction: 'warning', reviewTime: '8h' },
    'fake-profile': { priority: 2, autoAction: 'none', reviewTime: '24h' },
    'inappropriate-content': { priority: 3, autoAction: 'content-removal', reviewTime: '4h' },
    underage: { priority: 5, autoAction: 'immediate-suspension', reviewTime: '1h' },
    other: { priority: 1, autoAction: 'none', reviewTime: '48h' },
  },

  /**
   * Abuse pattern detection signals
   */
  abusePatterns: {
    spam: {
      signals: [
        'Identical messages to 10+ users',
        'High message rate with low response rate',
        'External links in early messages',
        'Template-like message patterns',
      ],
      confidence: 'high-if-3-or-more-signals',
    },
    scam: {
      signals: [
        'Financial requests in messages',
        'Crypto/investment mentions',
        'Moving conversation off-platform quickly',
        'Profile inconsistencies detected by fraud AI',
        'Romance scam language patterns',
      ],
      confidence: 'medium-human-review-required',
    },
    harassment: {
      signals: [
        'Profanity or slurs detected',
        'Repeated messaging after block/unmatch',
        'Threatening language',
        'Unwanted explicit content',
      ],
      confidence: 'high-if-clear-violation',
    },
    bot: {
      signals: [
        'Inhuman response times',
        'Failed verification multiple times',
        'Identical bio on multiple accounts',
        'IP associated with known bot networks',
      ],
      confidence: 'high-automated-action-ok',
    },
    fakeProfile: {
      signals: [
        'Stolen photos (reverse image search)',
        'Verification failed repeatedly',
        'Inconsistent profile information',
        'Multiple reports from different users',
      ],
      confidence: 'medium-human-review-required',
    },
  },

  /**
   * Action recommendation matrix
   */
  actionMatrix: {
    firstOffense: {
      minor: { action: 'warning', message: 'Your account has received a warning.' },
      moderate: { action: 'restriction', duration: '24h', message: 'Some features are temporarily limited.' },
      severe: { action: 'suspension', duration: '7d', message: 'Your account is suspended pending review.' },
    },
    repeatOffense: {
      minor: { action: 'restriction', duration: '72h' },
      moderate: { action: 'suspension', duration: '30d' },
      severe: { action: 'removal', requiresHumanApproval: true },
    },
    escalationTriggers: [
      'Threat of violence',
      'CSAM detection',
      'Potential underage user',
      'Organized scam network',
      'Legal subpoena',
    ],
  },

  /**
   * Appeal handling configuration
   */
  appealConfig: {
    eligibility: {
      canAppeal: ['warning', 'restriction', 'suspension'],
      cannotAppeal: ['permanent-ban-after-appeal', 'csam-violations'],
    },
    process: {
      submitVia: ['email', 'in-app-form'],
      requiredInfo: ['original-action', 'user-explanation', 'evidence-if-any'],
      reviewSLA: '72h',
      reviewers: ['senior-moderator', 'trust-safety-lead'],
    },
    reinstatement: {
      criteria: [
        'Clear evidence of mistake',
        'Context changes understanding',
        'First offense with genuine remorse',
      ],
      conditions: ['acknowledge-guidelines', 'no-repeat-violations-6mo'],
    },
  },

  /**
   * False positive risk assessment
   */
  falsePositiveRisk: {
    highRiskScenarios: [
      'Language/cultural misunderstanding',
      'Satire or humor misinterpreted',
      'Legitimate business mention flagged as scam',
      'Couples sharing account',
    ],
    mitigations: [
      'Always allow appeal before permanent action',
      'Weight verified accounts higher',
      'Consider account age and history',
      'Regional context for language',
    ],
    confidenceThresholds: {
      autoWarning: 0.9,
      autoRestriction: 0.95,
      autoSuspension: 'never-without-human',
      autoRemoval: 'never-without-human',
    },
  },
};

// ============================================================================
// AGENT 3: ADMIN & PLATFORM HEALTH AI
// ============================================================================

export type IncidentSeverity = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type IssueScope = 'user' | 'regional' | 'system';

export interface PlatformSignal {
  metric: string;
  value: number;
  threshold: number;
  trend: 'up' | 'down' | 'stable';
  scope: IssueScope;
}

export const ADMIN_PLATFORM_AI = {
  role: 'Assist admins, operators, and product owners',

  constraints: {
    noSilentChanges: true,
    noObscuredRisk: true,
    alwaysExplainTradeoffs: true,
  },

  /**
   * Platform health metrics to monitor
   */
  healthMetrics: {
    matching: {
      matchRate: { threshold: 0.05, unit: 'matches/user/day', alertBelow: true },
      discoveryLatency: { threshold: 500, unit: 'ms', alertAbove: true },
      algorithmErrorRate: { threshold: 0.01, unit: 'percent', alertAbove: true },
    },
    messaging: {
      deliverySuccessRate: { threshold: 0.995, unit: 'percent', alertBelow: true },
      queueDepth: { threshold: 10000, unit: 'messages', alertAbove: true },
      webSocketConnections: { threshold: 0, unit: 'active', alertBelow: true },
    },
    safety: {
      reportVolume: { threshold: 1.5, unit: 'x-baseline', alertAbove: true },
      moderationBacklog: { threshold: 100, unit: 'cases', alertAbove: true },
      fraudDetectionRate: { threshold: 0.001, unit: 'percent', alertBelow: true },
    },
    business: {
      signupRate: { threshold: 0.7, unit: 'x-baseline', alertBelow: true },
      churnRate: { threshold: 0.05, unit: 'monthly', alertAbove: true },
      revenuePerUser: { threshold: 0.8, unit: 'x-baseline', alertBelow: true },
    },
  },

  /**
   * Issue classification system
   */
  issueClassification: {
    user: {
      description: 'Issue affecting single user or small group',
      examples: ['Login issue', 'Missing matches', 'Payment failed'],
      response: 'Support ticket',
      escalation: 'Only if pattern detected',
    },
    regional: {
      description: 'Issue affecting specific geography',
      examples: ['CDN outage in region', 'Payment provider down', 'Regional content moderation spike'],
      response: 'Engineering + regional ops',
      escalation: 'If >5% of regional users affected',
    },
    system: {
      description: 'Platform-wide issue',
      examples: ['Database outage', 'Authentication service down', 'Global CDN failure'],
      response: 'Incident command',
      escalation: 'Immediate P0/P1',
    },
  },

  /**
   * Severity levels and response times
   */
  severityLevels: {
    P0: {
      description: 'Total platform outage',
      responseTime: '5 minutes',
      escalation: ['CEO', 'CTO', 'On-call-all'],
      examples: ['All users unable to login', 'Data breach detected'],
    },
    P1: {
      description: 'Major feature unavailable',
      responseTime: '15 minutes',
      escalation: ['Engineering lead', 'Product lead'],
      examples: ['Messaging completely down', 'Payments failing globally'],
    },
    P2: {
      description: 'Significant degradation',
      responseTime: '1 hour',
      escalation: ['Engineering on-call'],
      examples: ['High latency', 'Partial feature failure'],
    },
    P3: {
      description: 'Minor issue with workaround',
      responseTime: '4 hours',
      escalation: ['Assigned engineer'],
      examples: ['UI bug', 'Edge case failure'],
    },
    P4: {
      description: 'Low priority improvement',
      responseTime: '1 week',
      escalation: ['Backlog'],
      examples: ['Minor UX issue', 'Documentation update'],
    },
  },

  /**
   * Configuration change safety assessment
   */
  changeAssessment: {
    blastRadiusFactors: [
      'Percentage of users affected',
      'Revenue impact potential',
      'Rollback complexity',
      'Dependency chain length',
    ],
    requiredApprovals: {
      lowRisk: ['Engineer'],
      mediumRisk: ['Engineer', 'Tech lead'],
      highRisk: ['Engineer', 'Tech lead', 'Product'],
      critical: ['CTO approval required'],
    },
    rollbackRequirements: {
      always: ['Feature flags', 'Database migrations'],
      recommended: ['API changes', 'UI changes'],
      documented: ['All changes'],
    },
  },
};

// ============================================================================
// AGENT 4: DIAGNOSIS & SELF-HEALING OPS AI
// ============================================================================

export interface DiagnosisStep {
  check: string;
  command?: string;
  expectedResult: string;
  ifFail: string;
}

export interface DiagnosisFlow {
  name: string;
  description: string;
  steps: DiagnosisStep[];
  resolution: string;
}

export const DIAGNOSIS_OPS_AI = {
  role: 'Diagnose and resolve platform issues safely',

  constraints: {
    stateUncertaintyClearly: true,
    neverGuessSilently: true,
    preferReversibleActions: true,
  },

  /**
   * Structured diagnosis flows
   */
  diagnosisFlows: {
    missingMatches: {
      name: 'Missing Matches Investigation',
      correlations: [
        { check: 'profile-status', query: 'SELECT status FROM profiles WHERE user_id = ?', expect: 'active' },
        { check: 'ban-status', query: 'SELECT * FROM bans WHERE user_id = ?', expect: 'empty' },
        { check: 'preferences', query: 'SELECT * FROM preferences WHERE user_id = ?', expect: 'reasonable' },
        { check: 'algorithm-participation', service: 'matching-service', expect: 'included' },
        { check: 'feature-flags', flags: ['matching_enabled', 'discovery_enabled'], expect: 'true' },
      ],
      resolutions: {
        profileInactive: 'Reactivate profile',
        banned: 'Review ban status and appeal process',
        preferencesTooStrict: 'Suggest widening preferences',
        algorithmExcluded: 'Investigate algorithm exclusion reason',
        flagDisabled: 'Check why feature flag is off for user',
      },
    },
    messageDeliveryFailure: {
      name: 'Message Delivery Investigation',
      correlations: [
        { check: 'conversation-status', query: 'SELECT status FROM conversations WHERE id = ?', expect: 'active' },
        { check: 'block-status', query: 'SELECT * FROM blocks WHERE blocker_id = ? OR blocked_id = ?', expect: 'none' },
        { check: 'queue-health', service: 'rabbitmq', expect: 'healthy' },
        { check: 'websocket-connection', service: 'realtime-service', expect: 'connected' },
        { check: 'encryption-keys', service: 'key-management', expect: 'valid' },
      ],
      resolutions: {
        conversationClosed: 'User was unmatched',
        blocked: 'One user blocked the other',
        queueBacklog: 'Message queued, will deliver when caught up',
        disconnected: 'Refresh app to reconnect',
        keyExpired: 'Trigger key rotation',
      },
    },
    loginFailure: {
      name: 'Login Issue Investigation',
      correlations: [
        { check: 'auth-service-health', service: 'auth-service', expect: 'healthy' },
        { check: 'token-validity', query: 'SELECT expires_at FROM sessions WHERE user_id = ?', expect: 'valid' },
        { check: 'rate-limit-status', service: 'rate-limiter', expect: 'not-limited' },
        { check: 'account-lockout', query: 'SELECT locked_until FROM users WHERE id = ?', expect: 'null' },
        { check: 'verification-provider', service: 'twilio', expect: 'healthy' },
      ],
      resolutions: {
        authDown: 'Wait for service recovery',
        tokenExpired: 'Request new login',
        rateLimited: 'Wait 15 minutes',
        locked: 'Follow unlock procedure',
        providerDown: 'Try alternate verification method',
      },
    },
    subscriptionIssue: {
      name: 'Subscription Issue Investigation',
      correlations: [
        { check: 'stripe-webhook-status', service: 'webhook-service', expect: 'processing' },
        { check: 'subscription-record', query: 'SELECT * FROM subscriptions WHERE user_id = ?', expect: 'active' },
        { check: 'payment-method', service: 'stripe', expect: 'valid' },
        { check: 'entitlement-sync', service: 'entitlement-service', expect: 'synced' },
      ],
      resolutions: {
        webhookMissed: 'Trigger manual sync from Stripe',
        subscriptionMissing: 'Check Stripe dashboard and sync',
        paymentFailed: 'Update payment method',
        entitlementDesync: 'Force entitlement refresh',
      },
    },
  },

  /**
   * Self-healing action catalog
   */
  selfHealingActions: {
    automatic: [
      { trigger: 'connection-pool-exhausted', action: 'scale-pool', reversible: true },
      { trigger: 'cache-miss-spike', action: 'warm-cache', reversible: true },
      { trigger: 'queue-depth-high', action: 'scale-consumers', reversible: true },
    ],
    semiAutomatic: [
      { trigger: 'service-unhealthy', action: 'restart-service', requiresApproval: 'on-call' },
      { trigger: 'circuit-breaker-open', action: 'investigate-downstream', requiresApproval: 'none' },
    ],
    manual: [
      { trigger: 'data-corruption', action: 'restore-from-backup', requiresApproval: 'tech-lead' },
      { trigger: 'security-incident', action: 'lockdown-mode', requiresApproval: 'security-team' },
    ],
  },

  /**
   * Guardrail recommendations
   */
  guardrails: {
    preventive: [
      'Circuit breakers on all external calls',
      'Rate limiting on all public endpoints',
      'Connection pool limits per service',
      'Timeout on all database queries',
    ],
    detective: [
      'Anomaly detection on key metrics',
      'Log aggregation and alerting',
      'Distributed tracing for latency',
      'Error rate monitoring',
    ],
    corrective: [
      'Automatic scaling based on load',
      'Failover to backup regions',
      'Graceful degradation modes',
      'Rollback procedures documented',
    ],
  },
};

// ============================================================================
// AGENT 5: GLOBALIZATION & COMPLIANCE AI
// ============================================================================

export interface RegionalConfig {
  region: string;
  languages: string[];
  legalRequirements: string[];
  paymentMethods: string[];
  safetyFeatures: string[];
}

export const GLOBALIZATION_AI = {
  role: 'Ensure global usability and fairness',

  constraints: {
    noStereotypes: true,
    noCulturalAssumptions: true,
    noRegionBiasUnlessLegal: true,
  },

  /**
   * Regional configurations
   */
  regions: {
    EU: {
      languages: ['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt'],
      legalRequirements: ['GDPR', 'Digital Services Act', 'Age verification'],
      paymentMethods: ['card', 'sepa', 'sofort', 'ideal', 'bancontact'],
      safetyFeatures: ['standard'],
    },
    US: {
      languages: ['en', 'es'],
      legalRequirements: ['CCPA', 'State age-of-consent laws'],
      paymentMethods: ['card', 'apple-pay', 'google-pay'],
      safetyFeatures: ['standard'],
    },
    MENA: {
      languages: ['ar', 'en', 'fr'],
      legalRequirements: ['Local content laws', 'Data localization'],
      paymentMethods: ['card', 'local-wallets'],
      safetyFeatures: ['enhanced-privacy', 'lgbtq-safety-mode'],
    },
    APAC: {
      languages: ['en', 'zh', 'ja', 'ko', 'th', 'vi'],
      legalRequirements: ['PDPA variants', 'Local content laws'],
      paymentMethods: ['card', 'alipay', 'wechat-pay', 'line-pay'],
      safetyFeatures: ['standard'],
    },
    LATAM: {
      languages: ['es', 'pt'],
      legalRequirements: ['LGPD (Brazil)', 'Local data laws'],
      paymentMethods: ['card', 'pix', 'mercadopago', 'oxxo'],
      safetyFeatures: ['standard'],
    },
    SSA: {
      languages: ['en', 'fr', 'sw', 'pt'],
      legalRequirements: ['POPIA (South Africa)', 'Local laws vary'],
      paymentMethods: ['card', 'mpesa', 'paystack', 'flutterwave'],
      safetyFeatures: ['standard', 'lgbtq-safety-mode'],
    },
  },

  /**
   * Compliance requirements by regulation
   */
  compliance: {
    GDPR: {
      requirements: [
        'Right to access personal data',
        'Right to rectification',
        'Right to erasure (right to be forgotten)',
        'Right to data portability',
        'Right to object to processing',
        'Consent management',
        'Data breach notification (72 hours)',
        'Data Protection Officer required',
      ],
      implementation: {
        dataExport: '/api/gdpr/export',
        dataDeletion: '/api/gdpr/delete',
        consentManagement: '/api/gdpr/consent',
        dataAccessRequest: '/api/gdpr/access',
      },
    },
    CCPA: {
      requirements: [
        'Right to know what data is collected',
        'Right to delete personal information',
        'Right to opt-out of sale',
        'Right to non-discrimination',
      ],
      implementation: {
        optOut: '/api/ccpa/opt-out',
        doNotSell: '/api/ccpa/do-not-sell',
        dataRequest: '/api/ccpa/request',
      },
    },
    ageVerification: {
      requirements: [
        'Verify users are of legal age',
        'Block underage users immediately',
        'Report violations to authorities',
      ],
      methods: ['id-verification', 'ai-age-estimation', 'self-declaration'],
      minimumAge: 18, // Default, varies by region
    },
  },

  /**
   * Regional safety adaptations
   */
  safetyAdaptations: {
    lgbtqSafetyMode: {
      description: 'Additional privacy protections for LGBTQ+ users in restrictive regions',
      features: [
        'Hide app icon',
        'Quick exit button',
        'Decoy app appearance',
        'Location fuzzing',
        'No profile visibility outside region',
      ],
      regions: ['MENA', 'parts-of-SSA', 'parts-of-APAC'],
    },
    womensSafetyFeatures: {
      description: 'Enhanced safety for women users',
      features: [
        'Share date details with trusted contacts',
        'Check-in reminders',
        'Video verification before meeting',
        'Report reason: "felt unsafe"',
        'Emergency contact quick dial',
      ],
      availability: 'global',
    },
    emergencyContacts: {
      description: 'Region-specific emergency resources',
      configuration: {
        US: ['911', 'RAINN: 1-800-656-4673'],
        UK: ['999', 'Samaritans: 116 123'],
        EU: ['112', 'Regional helplines'],
      },
    },
  },

  /**
   * Language and cultural guidelines
   */
  languageGuidelines: {
    avoid: [
      'Idioms that don\'t translate',
      'Cultural-specific references',
      'Humor that may offend',
      'Assumptions about dating norms',
    ],
    ensure: [
      'Gender-neutral options available',
      'Inclusive pronoun options',
      'Respectful of relationship types',
      'Accessible language (reading level)',
    ],
    reviewProcess: [
      'Native speaker review for all translations',
      'Cultural sensitivity review',
      'Legal review for terms and policies',
    ],
  },
};

// ============================================================================
// UNIFIED PLATFORM INTELLIGENCE EXPORT
// ============================================================================

export const PLATFORM_INTELLIGENCE = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),

  coreRules: PLATFORM_CORE_RULES,
  userSupport: USER_SUPPORT_AI,
  trustSafety: TRUST_SAFETY_AI,
  adminPlatform: ADMIN_PLATFORM_AI,
  diagnosisOps: DIAGNOSIS_OPS_AI,
  globalization: GLOBALIZATION_AI,

  /**
   * Success conditions for the platform
   */
  successConditions: [
    'Users feel safe and understood',
    'Moderators trust the tools',
    'Admins see issues early',
    'Abuse decreases over time',
    'Support load drops',
    'Platform behaves predictably at scale',
  ],

  /**
   * Monitoring and interpretation priorities
   */
  monitoringPriorities: [
    { signal: 'logins-and-authentication', interpret: 'user-access-health' },
    { signal: 'matching-and-messaging', interpret: 'core-feature-health' },
    { signal: 'abuse-reports-and-trends', interpret: 'safety-risk' },
    { signal: 'subscription-lifecycle', interpret: 'business-health' },
  ],
};

export default PLATFORM_INTELLIGENCE;
