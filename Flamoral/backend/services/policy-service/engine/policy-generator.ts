/**
 * FLAMORAL Global Policy Generator & Auto-Maintenance Engine
 * Self-maintaining system for region-specific legal policies
 *
 * Version: 1.0.0
 * Last Updated: 2025-12-15
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type RegionCode =
  | 'US' | 'US-CA' | 'US-WA' | 'US-CO' | 'US-VA' | 'US-CT' | 'US-UT'
  | 'EU' | 'EU-DE' | 'EU-FR' | 'EU-IT' | 'EU-ES' | 'EU-NL'
  | 'UK' | 'CA' | 'AU' | 'NG' | 'BR' | 'MX' | 'AR'
  | 'SG' | 'JP' | 'KR' | 'IN' | 'AE' | 'SA' | 'ZA';

export type PolicyType =
  | 'privacy_policy'
  | 'terms_of_service'
  | 'cookie_policy'
  | 'community_guidelines'
  | 'trust_safety_policy'
  | 'anti_harassment_policy'
  | 'accessibility_statement'
  | 'intellectual_property'
  | 'modern_slavery_statement'
  | 'consumer_health_data_policy'
  | 'do_not_sell'
  | 'notice_at_collection'
  | 'age_verification_policy'
  | 'ai_transparency_policy';

export interface RegionConfig {
  code: RegionCode;
  name: string;
  language: string;
  timezone: string;
  currency: string;
  legalFramework: string[];
  ageOfConsent: number;
  dataProtectionAuthority?: string;
  specialRequirements: string[];
}

export interface PolicyVersion {
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  changeLog: ChangeLogEntry[];
}

export interface ChangeLogEntry {
  date: string;
  version: string;
  changes: string[];
  affectedRegions: RegionCode[];
  reason: string;
}

export interface GeneratedPolicy {
  type: PolicyType;
  region: RegionCode;
  version: PolicyVersion;
  content: string;
  summary: string;
  userRights: string[];
  lastReviewedDate: string;
  nextReviewDate: string;
}

export interface RegulatoryUpdate {
  id: string;
  source: string;
  region: RegionCode;
  effectiveDate: string;
  description: string;
  affectedPolicies: PolicyType[];
  status: 'pending' | 'applied' | 'reviewed' | 'dismissed';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================================================
// REGION CONFIGURATIONS
// ============================================================================

export const regionConfigs: Record<RegionCode, RegionConfig> = {
  // United States
  'US': {
    code: 'US',
    name: 'United States',
    language: 'en-US',
    timezone: 'America/New_York',
    currency: 'USD',
    legalFramework: ['FTC Act', 'CAN-SPAM', 'COPPA', 'Section 230'],
    ageOfConsent: 18,
    specialRequirements: [
      'COPPA compliance for users under 13',
      'CAN-SPAM compliance for marketing emails',
      'Arbitration clause with opt-out',
    ],
  },
  'US-CA': {
    code: 'US-CA',
    name: 'United States - California',
    language: 'en-US',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    legalFramework: ['CCPA', 'CPRA', 'CalOPPA', 'Shine the Light'],
    ageOfConsent: 18,
    dataProtectionAuthority: 'California Privacy Protection Agency',
    specialRequirements: [
      'CCPA/CPRA compliance',
      'Right to opt-out of sale/sharing',
      'Right to limit use of sensitive personal information',
      'Notice at collection requirements',
      'Do Not Sell link required',
      'Global Privacy Control recognition',
    ],
  },
  'US-WA': {
    code: 'US-WA',
    name: 'United States - Washington',
    language: 'en-US',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    legalFramework: ['My Health My Data Act', 'Washington Privacy Act'],
    ageOfConsent: 18,
    specialRequirements: [
      'Consumer health data specific consent',
      'Data deletion requirements',
      'Geofencing prohibition around health facilities',
    ],
  },
  'US-CO': {
    code: 'US-CO',
    name: 'United States - Colorado',
    language: 'en-US',
    timezone: 'America/Denver',
    currency: 'USD',
    legalFramework: ['Colorado Privacy Act'],
    ageOfConsent: 18,
    specialRequirements: [
      'Universal opt-out mechanism',
      'Data protection assessments',
      'Sensitive data consent requirements',
    ],
  },
  'US-VA': {
    code: 'US-VA',
    name: 'United States - Virginia',
    language: 'en-US',
    timezone: 'America/New_York',
    currency: 'USD',
    legalFramework: ['Virginia Consumer Data Protection Act'],
    ageOfConsent: 18,
    specialRequirements: [
      'Consumer data rights',
      'Opt-out requirements',
      'Sensitive data protections',
    ],
  },
  'US-CT': {
    code: 'US-CT',
    name: 'United States - Connecticut',
    language: 'en-US',
    timezone: 'America/New_York',
    currency: 'USD',
    legalFramework: ['Connecticut Data Privacy Act'],
    ageOfConsent: 18,
    specialRequirements: [
      'Consumer privacy rights',
      'Global opt-out recognition',
    ],
  },
  'US-UT': {
    code: 'US-UT',
    name: 'United States - Utah',
    language: 'en-US',
    timezone: 'America/Denver',
    currency: 'USD',
    legalFramework: ['Utah Consumer Privacy Act'],
    ageOfConsent: 18,
    specialRequirements: [
      'Consumer privacy rights',
      'Sensitive data requirements',
    ],
  },

  // European Union
  'EU': {
    code: 'EU',
    name: 'European Union',
    language: 'en',
    timezone: 'Europe/Brussels',
    currency: 'EUR',
    legalFramework: ['GDPR', 'ePrivacy Directive', 'DSA', 'DMA'],
    ageOfConsent: 16,
    dataProtectionAuthority: 'European Data Protection Board',
    specialRequirements: [
      'GDPR compliance',
      'Lawful basis for processing',
      'Data subject rights',
      'Data Protection Officer requirement',
      'Cross-border transfer safeguards',
      'Data breach notification (72 hours)',
      'Privacy by design and default',
    ],
  },
  'EU-DE': {
    code: 'EU-DE',
    name: 'Germany',
    language: 'de',
    timezone: 'Europe/Berlin',
    currency: 'EUR',
    legalFramework: ['GDPR', 'BDSG', 'TTDSG'],
    ageOfConsent: 16,
    dataProtectionAuthority: 'BfDI',
    specialRequirements: [
      'Strict GDPR interpretation',
      'Works council requirements',
      'Telemediengesetz compliance',
    ],
  },
  'EU-FR': {
    code: 'EU-FR',
    name: 'France',
    language: 'fr',
    timezone: 'Europe/Paris',
    currency: 'EUR',
    legalFramework: ['GDPR', 'Loi Informatique et Libertés'],
    ageOfConsent: 15,
    dataProtectionAuthority: 'CNIL',
    specialRequirements: [
      'CNIL guidelines on cookies',
      'Specific consent requirements',
    ],
  },
  'EU-IT': {
    code: 'EU-IT',
    name: 'Italy',
    language: 'it',
    timezone: 'Europe/Rome',
    currency: 'EUR',
    legalFramework: ['GDPR', 'Italian Privacy Code'],
    ageOfConsent: 14,
    dataProtectionAuthority: 'Garante',
    specialRequirements: [
      'Garante guidelines',
      'Marketing consent specifics',
    ],
  },
  'EU-ES': {
    code: 'EU-ES',
    name: 'Spain',
    language: 'es',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    legalFramework: ['GDPR', 'LOPDGDD'],
    ageOfConsent: 14,
    dataProtectionAuthority: 'AEPD',
    specialRequirements: [
      'AEPD guidance compliance',
    ],
  },
  'EU-NL': {
    code: 'EU-NL',
    name: 'Netherlands',
    language: 'nl',
    timezone: 'Europe/Amsterdam',
    currency: 'EUR',
    legalFramework: ['GDPR', 'UAVG'],
    ageOfConsent: 16,
    dataProtectionAuthority: 'Autoriteit Persoonsgegevens',
    specialRequirements: [
      'Dutch implementation specifics',
    ],
  },

  // United Kingdom
  'UK': {
    code: 'UK',
    name: 'United Kingdom',
    language: 'en-GB',
    timezone: 'Europe/London',
    currency: 'GBP',
    legalFramework: ['UK GDPR', 'Data Protection Act 2018', 'PECR', 'Online Safety Act'],
    ageOfConsent: 13,
    dataProtectionAuthority: 'Information Commissioner\'s Office (ICO)',
    specialRequirements: [
      'UK GDPR compliance',
      'ICO guidance',
      'Online Safety Act requirements',
      'Age verification requirements',
      'Modern Slavery Statement',
    ],
  },

  // Canada
  'CA': {
    code: 'CA',
    name: 'Canada',
    language: 'en-CA',
    timezone: 'America/Toronto',
    currency: 'CAD',
    legalFramework: ['PIPEDA', 'CASL', 'Quebec Law 25'],
    ageOfConsent: 18,
    dataProtectionAuthority: 'Office of the Privacy Commissioner',
    specialRequirements: [
      'PIPEDA compliance',
      'CASL anti-spam compliance',
      'Quebec Law 25 requirements',
      'Meaningful consent',
    ],
  },

  // Australia
  'AU': {
    code: 'AU',
    name: 'Australia',
    language: 'en-AU',
    timezone: 'Australia/Sydney',
    currency: 'AUD',
    legalFramework: ['Privacy Act 1988', 'APPs', 'Spam Act', 'Online Safety Act'],
    ageOfConsent: 18,
    dataProtectionAuthority: 'Office of the Australian Information Commissioner',
    specialRequirements: [
      'Australian Privacy Principles',
      'Notifiable data breaches',
      'APP 6 cross-border disclosure',
      'Online Safety Act compliance',
    ],
  },

  // Nigeria
  'NG': {
    code: 'NG',
    name: 'Nigeria',
    language: 'en-NG',
    timezone: 'Africa/Lagos',
    currency: 'NGN',
    legalFramework: ['NDPR', 'NDPR Implementation Framework'],
    ageOfConsent: 18,
    dataProtectionAuthority: 'NITDA',
    specialRequirements: [
      'NDPR compliance',
      'Data audit requirements',
      'Local storage considerations',
    ],
  },

  // Latin America
  'BR': {
    code: 'BR',
    name: 'Brazil',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    legalFramework: ['LGPD', 'Marco Civil'],
    ageOfConsent: 18,
    dataProtectionAuthority: 'ANPD',
    specialRequirements: [
      'LGPD compliance',
      'Data subject rights',
      'DPO requirement',
    ],
  },
  'MX': {
    code: 'MX',
    name: 'Mexico',
    language: 'es-MX',
    timezone: 'America/Mexico_City',
    currency: 'MXN',
    legalFramework: ['LFPDPPP'],
    ageOfConsent: 18,
    dataProtectionAuthority: 'INAI',
    specialRequirements: [
      'Privacy notice requirements',
      'ARCO rights',
    ],
  },
  'AR': {
    code: 'AR',
    name: 'Argentina',
    language: 'es-AR',
    timezone: 'America/Buenos_Aires',
    currency: 'ARS',
    legalFramework: ['Personal Data Protection Law'],
    ageOfConsent: 18,
    dataProtectionAuthority: 'AAIP',
    specialRequirements: [
      'EU adequacy status',
      'Cross-border transfer rules',
    ],
  },

  // Asia Pacific
  'SG': {
    code: 'SG',
    name: 'Singapore',
    language: 'en-SG',
    timezone: 'Asia/Singapore',
    currency: 'SGD',
    legalFramework: ['PDPA'],
    ageOfConsent: 21,
    dataProtectionAuthority: 'PDPC',
    specialRequirements: [
      'PDPA compliance',
      'DNC registry',
      'Data breach notification',
    ],
  },
  'JP': {
    code: 'JP',
    name: 'Japan',
    language: 'ja',
    timezone: 'Asia/Tokyo',
    currency: 'JPY',
    legalFramework: ['APPI'],
    ageOfConsent: 18,
    dataProtectionAuthority: 'PPC',
    specialRequirements: [
      'APPI compliance',
      'Cross-border transfer requirements',
      'Special care personal information',
    ],
  },
  'KR': {
    code: 'KR',
    name: 'South Korea',
    language: 'ko',
    timezone: 'Asia/Seoul',
    currency: 'KRW',
    legalFramework: ['PIPA'],
    ageOfConsent: 14,
    dataProtectionAuthority: 'PIPC',
    specialRequirements: [
      'PIPA compliance',
      'Consent specificity',
      'Data localization considerations',
    ],
  },
  'IN': {
    code: 'IN',
    name: 'India',
    language: 'en-IN',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    legalFramework: ['IT Act', 'DPDP Act'],
    ageOfConsent: 18,
    dataProtectionAuthority: 'Data Protection Board',
    specialRequirements: [
      'DPDP Act compliance',
      'Consent manager requirements',
      'Significant data fiduciary obligations',
    ],
  },

  // Middle East
  'AE': {
    code: 'AE',
    name: 'United Arab Emirates',
    language: 'en',
    timezone: 'Asia/Dubai',
    currency: 'AED',
    legalFramework: ['Federal Decree Law No. 45', 'DIFC Data Protection Law'],
    ageOfConsent: 21,
    specialRequirements: [
      'Federal data protection law',
      'Cross-border transfer restrictions',
      'Content moderation requirements',
    ],
  },
  'SA': {
    code: 'SA',
    name: 'Saudi Arabia',
    language: 'ar',
    timezone: 'Asia/Riyadh',
    currency: 'SAR',
    legalFramework: ['Personal Data Protection Law'],
    ageOfConsent: 21,
    specialRequirements: [
      'PDPL compliance',
      'Data localization',
      'Content restrictions',
    ],
  },

  // Africa
  'ZA': {
    code: 'ZA',
    name: 'South Africa',
    language: 'en-ZA',
    timezone: 'Africa/Johannesburg',
    currency: 'ZAR',
    legalFramework: ['POPIA'],
    ageOfConsent: 18,
    dataProtectionAuthority: 'Information Regulator',
    specialRequirements: [
      'POPIA compliance',
      'Information officer requirement',
      'Cross-border transfer requirements',
    ],
  },
};

// ============================================================================
// POLICY GENERATOR CLASS
// ============================================================================

export class PolicyGenerator {
  private versionHistory: Map<string, PolicyVersion[]> = new Map();
  private regulatoryUpdates: RegulatoryUpdate[] = [];
  private generatedPolicies: Map<string, GeneratedPolicy> = new Map();

  constructor() {
    this.initializeVersionHistory();
  }

  private initializeVersionHistory(): void {
    // Initialize with base version for all policy types
    const policyTypes: PolicyType[] = [
      'privacy_policy',
      'terms_of_service',
      'cookie_policy',
      'community_guidelines',
      'trust_safety_policy',
      'anti_harassment_policy',
    ];

    policyTypes.forEach((type) => {
      this.versionHistory.set(type, [
        {
          version: '3.0.0',
          effectiveDate: '2025-12-15',
          lastUpdated: '2025-12-15',
          changeLog: [
            {
              date: '2025-12-15',
              version: '3.0.0',
              changes: ['Initial release of FLAMORAL policy framework'],
              affectedRegions: ['US', 'EU', 'UK', 'CA', 'AU'],
              reason: 'Platform launch',
            },
          ],
        },
      ]);
    });
  }

  /**
   * Generate a region-specific policy
   */
  public generatePolicy(
    type: PolicyType,
    region: RegionCode
  ): GeneratedPolicy {
    const regionConfig = regionConfigs[region];
    if (!regionConfig) {
      throw new Error(`Unknown region: ${region}`);
    }

    const baseContent = this.getBasePolicyContent(type);
    const regionSpecificContent = this.applyRegionRequirements(
      baseContent,
      type,
      regionConfig
    );
    const version = this.getCurrentVersion(type);

    const policy: GeneratedPolicy = {
      type,
      region,
      version,
      content: regionSpecificContent,
      summary: this.generateSummary(type, regionConfig),
      userRights: this.getUserRights(type, regionConfig),
      lastReviewedDate: new Date().toISOString().split('T')[0],
      nextReviewDate: this.calculateNextReviewDate(),
    };

    const key = `${type}-${region}`;
    this.generatedPolicies.set(key, policy);

    return policy;
  }

  /**
   * Generate all policies for a region
   */
  public generateAllPoliciesForRegion(region: RegionCode): GeneratedPolicy[] {
    const policyTypes: PolicyType[] = [
      'privacy_policy',
      'terms_of_service',
      'cookie_policy',
      'community_guidelines',
      'trust_safety_policy',
      'anti_harassment_policy',
      'accessibility_statement',
    ];

    // Add region-specific policies
    const regionConfig = regionConfigs[region];
    if (regionConfig.legalFramework.includes('CCPA') || regionConfig.legalFramework.includes('CPRA')) {
      policyTypes.push('do_not_sell', 'notice_at_collection');
    }
    if (region === 'US-WA') {
      policyTypes.push('consumer_health_data_policy');
    }
    if (region === 'UK') {
      policyTypes.push('modern_slavery_statement');
    }

    return policyTypes.map((type) => this.generatePolicy(type, region));
  }

  /**
   * Apply a regulatory update
   */
  public applyRegulatoryUpdate(update: RegulatoryUpdate): void {
    this.regulatoryUpdates.push(update);

    if (update.status === 'pending') {
      // Queue for review
      console.log(`Regulatory update queued: ${update.id}`);
    }
  }

  /**
   * Process pending regulatory updates
   */
  public processPendingUpdates(): ChangeLogEntry[] {
    const pendingUpdates = this.regulatoryUpdates.filter(
      (u) => u.status === 'pending'
    );
    const appliedChanges: ChangeLogEntry[] = [];

    for (const update of pendingUpdates) {
      // Process each affected policy
      for (const policyType of update.affectedPolicies) {
        const change: ChangeLogEntry = {
          date: new Date().toISOString().split('T')[0],
          version: this.incrementVersion(policyType),
          changes: [update.description],
          affectedRegions: [update.region],
          reason: `Regulatory update: ${update.source}`,
        };

        this.addToVersionHistory(policyType, change);
        appliedChanges.push(change);
      }

      update.status = 'applied';
    }

    return appliedChanges;
  }

  /**
   * Generate "What Changed" summary for users
   */
  public generateChangesSummary(
    policyType: PolicyType,
    region: RegionCode
  ): string {
    const history = this.versionHistory.get(policyType) || [];
    const recentChanges = history
      .flatMap((v) => v.changeLog)
      .filter((c) => c.affectedRegions.includes(region))
      .slice(0, 5);

    if (recentChanges.length === 0) {
      return 'No recent changes to this policy.';
    }

    let summary = '## What Changed\n\n';
    for (const change of recentChanges) {
      summary += `### Version ${change.version} (${change.date})\n`;
      summary += change.changes.map((c) => `- ${c}`).join('\n');
      summary += `\n*Reason: ${change.reason}*\n\n`;
    }

    return summary;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getBasePolicyContent(type: PolicyType): string {
    // Returns base policy template content
    const templates: Record<PolicyType, string> = {
      privacy_policy: 'Base privacy policy content...',
      terms_of_service: 'Base terms of service content...',
      cookie_policy: 'Base cookie policy content...',
      community_guidelines: 'Base community guidelines content...',
      trust_safety_policy: 'Base trust and safety policy content...',
      anti_harassment_policy: 'Base anti-harassment policy content...',
      accessibility_statement: 'Base accessibility statement content...',
      intellectual_property: 'Base intellectual property policy content...',
      modern_slavery_statement: 'Base modern slavery statement content...',
      consumer_health_data_policy: 'Base consumer health data policy content...',
      do_not_sell: 'Base do not sell policy content...',
      notice_at_collection: 'Base notice at collection content...',
      age_verification_policy: 'Base age verification policy content...',
      ai_transparency_policy: 'Base AI transparency policy content...',
    };

    return templates[type] || '';
  }

  private applyRegionRequirements(
    content: string,
    type: PolicyType,
    regionConfig: RegionConfig
  ): string {
    let modifiedContent = content;

    // Apply region-specific legal framework requirements
    for (const framework of regionConfig.legalFramework) {
      modifiedContent += this.getFrameworkAdditions(type, framework);
    }

    // Apply special requirements
    for (const requirement of regionConfig.specialRequirements) {
      modifiedContent += `\n\n### ${requirement}\n`;
      modifiedContent += this.getRequirementContent(requirement);
    }

    // Apply data protection authority information
    if (regionConfig.dataProtectionAuthority) {
      modifiedContent += `\n\n### Supervisory Authority\n`;
      modifiedContent += `You may lodge a complaint with ${regionConfig.dataProtectionAuthority}.`;
    }

    return modifiedContent;
  }

  private getFrameworkAdditions(type: PolicyType, framework: string): string {
    // Framework-specific content additions
    const additions: Record<string, Record<PolicyType, string>> = {
      GDPR: {
        privacy_policy: `
## GDPR-Specific Rights

Under the General Data Protection Regulation, you have the following rights:
- Right of access (Article 15)
- Right to rectification (Article 16)
- Right to erasure (Article 17)
- Right to restriction of processing (Article 18)
- Right to data portability (Article 20)
- Right to object (Article 21)
- Rights related to automated decision-making (Article 22)

**Lawful Basis for Processing**
We process your data under the following lawful bases:
- Contract performance (providing our dating services)
- Legitimate interests (security, fraud prevention, service improvement)
- Consent (marketing communications, sensitive data processing)
- Legal obligation (responding to lawful requests)
`,
        terms_of_service: '',
        cookie_policy: `
## Cookie Consent (GDPR/ePrivacy)

We obtain your consent before placing non-essential cookies. You can manage your preferences at any time through our Cookie Settings.

**Essential Cookies**: Required for basic functionality - no consent needed
**Analytics Cookies**: Require your consent
**Marketing Cookies**: Require your consent
`,
        community_guidelines: '',
        trust_safety_policy: '',
        anti_harassment_policy: '',
        accessibility_statement: '',
        intellectual_property: '',
        modern_slavery_statement: '',
        consumer_health_data_policy: '',
        do_not_sell: '',
        notice_at_collection: '',
        age_verification_policy: '',
        ai_transparency_policy: '',
      },
      CCPA: {
        privacy_policy: `
## California Privacy Rights (CCPA/CPRA)

If you are a California resident, you have the following rights:
- Right to know what personal information we collect, use, and disclose
- Right to delete your personal information
- Right to correct inaccurate personal information
- Right to opt-out of the sale or sharing of personal information
- Right to limit use of sensitive personal information
- Right to non-discrimination for exercising your privacy rights

**Categories of Personal Information Collected**
- Identifiers (name, email, phone number)
- Personal records (photos, bio)
- Protected classifications (age, gender, sexual orientation)
- Commercial information (purchase history)
- Internet activity (usage data, device information)
- Geolocation data
- Sensory data (photos, voice messages)
- Inferences (compatibility scores)

**We Do Not Sell Your Personal Information**
FLAMORAL does not sell personal information as defined under CCPA.

**Right to Opt-Out**
To opt out of the sharing of personal information for targeted advertising, click "Do Not Sell or Share My Personal Information" in the footer or visit flamoral.com/privacy/do-not-sell.
`,
        terms_of_service: '',
        cookie_policy: '',
        community_guidelines: '',
        trust_safety_policy: '',
        anti_harassment_policy: '',
        accessibility_statement: '',
        intellectual_property: '',
        modern_slavery_statement: '',
        consumer_health_data_policy: '',
        do_not_sell: `
## Do Not Sell or Share My Personal Information

Under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA), California residents have the right to opt-out of the sale or sharing of their personal information.

**What This Means**
"Selling" and "Sharing" have specific legal meanings under California law that are broader than their everyday meanings.

**FLAMORAL's Practices**
- We do NOT sell personal information for monetary consideration
- We may share data with advertising partners to deliver relevant ads
- You can opt-out of this sharing below

**How to Opt-Out**
- Toggle the setting below
- Use a Global Privacy Control (GPC) signal in your browser
- Contact privacy@flamoral.com

**Verification**
We will verify your identity before processing your request.
`,
        notice_at_collection: `
## Notice at Collection

This notice is provided pursuant to the California Consumer Privacy Act (CCPA).

**Categories of Personal Information Collected**
| Category | Examples | Purpose |
|----------|----------|---------|
| Identifiers | Name, email, phone | Account creation, communication |
| Personal Records | Photos, bio | Profile display |
| Protected Classifications | Age, gender, orientation | Matching services |
| Commercial Info | Purchases | Subscription management |
| Internet Activity | Usage data | Service improvement |
| Geolocation | Location | Nearby matches |
| Sensory Data | Photos, voice | Profile features |
| Inferences | Compatibility scores | Matching algorithm |

**Retention Period**
We retain data while your account is active plus up to 30 days after deletion for most data, and up to 7 years for financial records.

**Your Rights**
See our Privacy Policy for a complete description of your rights.
`,
        age_verification_policy: '',
        ai_transparency_policy: '',
      },
    };

    return additions[framework]?.[type] || '';
  }

  private getRequirementContent(requirement: string): string {
    const contents: Record<string, string> = {
      'CCPA/CPRA compliance': 'Full compliance with California privacy regulations including consumer rights and data sharing disclosures.',
      'Right to opt-out of sale/sharing': 'You may opt-out of the sale or sharing of your personal information by visiting our "Do Not Sell or Share" page.',
      'Consumer health data specific consent': 'We obtain specific consent before collecting consumer health data as required by Washington\'s My Health My Data Act.',
      'Modern Slavery Statement': 'FLAMORAL is committed to preventing modern slavery and human trafficking in our operations and supply chain.',
      'Data breach notification (72 hours)': 'We will notify the relevant supervisory authority within 72 hours of becoming aware of a personal data breach.',
      'Australian Privacy Principles': 'We comply with all Australian Privacy Principles as set out in the Privacy Act 1988.',
    };

    return contents[requirement] || 'Compliance measures in place.';
  }

  private generateSummary(type: PolicyType, regionConfig: RegionConfig): string {
    const summaries: Record<PolicyType, string> = {
      privacy_policy: `This Privacy Policy explains how we handle your personal information in ${regionConfig.name}. Key points: We collect information to provide our dating services, we never sell your personal information, and you have full control over your data.`,
      terms_of_service: `These Terms of Service govern your use of FLAMORAL in ${regionConfig.name}. Key points: You must be ${regionConfig.ageOfConsent}+ to use the service, follow our Community Guidelines, and agree to our dispute resolution process.`,
      cookie_policy: `This Cookie Policy explains how we use cookies and similar technologies. Key points: Essential cookies are required for the service, analytics and marketing cookies require your consent.`,
      community_guidelines: `Our Community Guidelines ensure FLAMORAL is safe and welcoming. Key points: Be respectful, be authentic, report violations.`,
      trust_safety_policy: `Our Trust & Safety Policy outlines how we protect you. Key points: Multi-layer verification, 24/7 moderation, zero tolerance for abuse.`,
      anti_harassment_policy: `Our Anti-Harassment Policy defines prohibited behaviors. Key points: No harassment, stalking, or abuse is tolerated.`,
      accessibility_statement: `Our Accessibility Statement explains our commitment to accessible design. Key points: WCAG 2.1 AA compliance target, accessibility feedback welcome.`,
      intellectual_property: `Our Intellectual Property policy protects creative works. Key points: Respect copyrights, report infringement.`,
      modern_slavery_statement: `Our Modern Slavery Statement outlines our commitment to ethical practices. Key points: Supply chain due diligence, employee training.`,
      consumer_health_data_policy: `This policy explains how we handle consumer health data under Washington law. Key points: Specific consent required, deletion rights.`,
      do_not_sell: `This page allows you to opt-out of the sale or sharing of your personal information.`,
      notice_at_collection: `This notice explains what personal information we collect and why at the point of collection.`,
      age_verification_policy: `Our Age Verification Policy ensures all users meet minimum age requirements.`,
      ai_transparency_policy: `Our AI Transparency Policy explains how we use artificial intelligence in our services.`,
    };

    return summaries[type] || 'Summary not available.';
  }

  private getUserRights(type: PolicyType, regionConfig: RegionConfig): string[] {
    const baseRights = [
      'Access your personal data',
      'Correct inaccurate data',
      'Delete your data',
      'Download your data',
    ];

    const additionalRights: Record<string, string[]> = {
      GDPR: [
        'Right to restrict processing',
        'Right to object to processing',
        'Right to data portability',
        'Right to withdraw consent',
        'Right to lodge a complaint with a supervisory authority',
      ],
      CCPA: [
        'Right to know what information is collected',
        'Right to opt-out of sale/sharing',
        'Right to non-discrimination',
        'Right to limit sensitive data use',
      ],
      LGPD: [
        'Right to anonymization',
        'Right to revoke consent',
        'Right to information about data sharing',
      ],
    };

    let rights = [...baseRights];
    for (const framework of regionConfig.legalFramework) {
      if (additionalRights[framework]) {
        rights = rights.concat(additionalRights[framework]);
      }
    }

    return [...new Set(rights)]; // Remove duplicates
  }

  private getCurrentVersion(type: PolicyType): PolicyVersion {
    const history = this.versionHistory.get(type);
    return history?.[history.length - 1] || {
      version: '1.0.0',
      effectiveDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0],
      changeLog: [],
    };
  }

  private incrementVersion(type: PolicyType): string {
    const current = this.getCurrentVersion(type);
    const [major, minor, patch] = current.version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  private addToVersionHistory(type: PolicyType, change: ChangeLogEntry): void {
    const history = this.versionHistory.get(type) || [];
    const newVersion: PolicyVersion = {
      version: change.version,
      effectiveDate: change.date,
      lastUpdated: change.date,
      changeLog: [change],
    };
    history.push(newVersion);
    this.versionHistory.set(type, history);
  }

  private calculateNextReviewDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 6); // Review every 6 months
    return date.toISOString().split('T')[0];
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const policyGenerator = new PolicyGenerator();
export default PolicyGenerator;
