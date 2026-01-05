/**
 * Policy Controller
 * Handles policy retrieval, validation, and management
 */

import { privacyPolicy } from '../../policies/privacy-policy';
import { termsOfService } from '../../policies/terms-of-service';
import { trustSafetyPolicy } from '../../policies/trust-safety-policy';

// Supported regions with their configurations
const SUPPORTED_REGIONS = [
  { code: 'US', name: 'United States', regulations: ['CCPA', 'COPPA'] },
  { code: 'EU', name: 'European Union', regulations: ['GDPR', 'ePrivacy'] },
  { code: 'UK', name: 'United Kingdom', regulations: ['UK-GDPR', 'DPA'] },
  { code: 'CA', name: 'Canada', regulations: ['PIPEDA', 'CASL'] },
  { code: 'AU', name: 'Australia', regulations: ['Privacy Act', 'CDR'] },
  { code: 'BR', name: 'Brazil', regulations: ['LGPD'] },
  { code: 'JP', name: 'Japan', regulations: ['APPI'] },
  { code: 'KR', name: 'South Korea', regulations: ['PIPA'] },
  { code: 'IN', name: 'India', regulations: ['IT Act', 'PDPB'] },
  { code: 'SG', name: 'Singapore', regulations: ['PDPA'] },
  { code: 'GLOBAL', name: 'Global (Default)', regulations: [] },
];

// Policy type definitions
const POLICY_TYPES = [
  { id: 'privacy', name: 'Privacy Policy', description: 'How we collect and use your data' },
  { id: 'terms', name: 'Terms of Service', description: 'Terms and conditions for using Flamoral' },
  {
    id: 'trust-safety',
    name: 'Trust & Safety',
    description: 'Community guidelines and safety policies',
  },
  { id: 'cookies', name: 'Cookie Policy', description: 'How we use cookies and tracking' },
  { id: 'gdpr', name: 'GDPR Notice', description: 'EU data protection rights' },
  { id: 'ccpa', name: 'CCPA Notice', description: 'California privacy rights' },
];

// Policy storage - maps policy type to policy data
const policyRegistry: Record<string, any> = {
  privacy: privacyPolicy,
  terms: termsOfService,
  'trust-safety': trustSafetyPolicy,
};

// Version history storage (in production, this would be in a database)
const versionHistory: Map<
  string,
  Array<{
    version: string;
    publishedAt: string;
    changedBy: string;
    changes: string;
  }>
> = new Map();

// Initialize version history from policies
Object.entries(policyRegistry).forEach(([type, policy]) => {
  if (policy?.version) {
    versionHistory.set(type, [
      {
        version: policy.version,
        publishedAt: policy.effectiveDate || new Date().toISOString(),
        changedBy: 'system',
        changes: 'Initial policy version',
      },
    ]);
  }
});

export interface PolicyParams {
  region: string;
  policyType: string;
  language: string;
  format: string;
  version?: string;
}

export interface PolicySummaryParams {
  region: string;
  policyType: string;
  language: string;
}

export interface PolicyValidationParams {
  content: string;
  region: string;
  policyType: string;
}

export class PolicyController {
  /**
   * Retrieves a policy document
   */
  async getPolicy(params: PolicyParams) {
    const { region, policyType, language, format, version } = params;

    // Validate policy type
    const policyTypeConfig = POLICY_TYPES.find((p) => p.id === policyType);
    if (!policyTypeConfig) {
      throw new Error(`Invalid policy type: ${policyType}`);
    }

    // Get the policy
    const policy = policyRegistry[policyType];
    if (!policy) {
      throw new Error(`Policy not found: ${policyType}`);
    }

    // If specific version requested, check version history
    if (version && policy.version !== version) {
      const history = versionHistory.get(policyType);
      const historicalVersion = history?.find((v) => v.version === version);
      if (!historicalVersion) {
        throw new Error(`Version ${version} not found for policy ${policyType}`);
      }
    }

    // Get region-specific adjustments
    const regionConfig =
      SUPPORTED_REGIONS.find((r) => r.code === region) ||
      SUPPORTED_REGIONS.find((r) => r.code === 'GLOBAL');

    // Format response based on requested format
    const response = {
      policyType: policyTypeConfig,
      region: regionConfig,
      language,
      version: policy.version,
      effectiveDate: policy.effectiveDate,
      lastUpdated: policy.lastUpdated,
      content: this.formatPolicy(policy, format),
      metadata: {
        applicableRegulations: regionConfig?.regulations || [],
        requestedAt: new Date().toISOString(),
      },
    };

    return response;
  }

  /**
   * Formats policy content based on requested format
   */
  private formatPolicy(policy: any, format: string): any {
    switch (format.toLowerCase()) {
      case 'html':
        return this.convertToHtml(policy);
      case 'markdown':
        return this.convertToMarkdown(policy);
      case 'plain':
        return this.convertToPlainText(policy);
      case 'json':
      default:
        return policy;
    }
  }

  private convertToHtml(policy: any): string {
    let html = `<div class="policy">`;
    html += `<h1>${policy.title || 'Policy Document'}</h1>`;
    html += `<p class="summary">${policy.summary || ''}</p>`;

    if (policy.sections) {
      policy.sections.forEach((section: any) => {
        html += `<section id="${section.id}">`;
        html += `<h2>${section.title}</h2>`;
        html += `<div class="content">${section.content}</div>`;
        if (section.examples) {
          html += `<ul class="examples">`;
          section.examples.forEach((ex: string) => (html += `<li>${ex}</li>`));
          html += `</ul>`;
        }
        html += `</section>`;
      });
    }

    html += `</div>`;
    return html;
  }

  private convertToMarkdown(policy: any): string {
    let md = `# ${policy.title || 'Policy Document'}\n\n`;
    md += `${policy.summary || ''}\n\n`;

    if (policy.sections) {
      policy.sections.forEach((section: any) => {
        md += `## ${section.title}\n\n`;
        md += `${section.content}\n\n`;
        if (section.examples) {
          section.examples.forEach((ex: string) => (md += `- ${ex}\n`));
          md += '\n';
        }
      });
    }

    return md;
  }

  private convertToPlainText(policy: any): string {
    let text = `${policy.title || 'Policy Document'}\n`;
    text += '='.repeat(50) + '\n\n';
    text += `${policy.summary || ''}\n\n`;

    if (policy.sections) {
      policy.sections.forEach((section: any) => {
        text += `${section.title}\n`;
        text += '-'.repeat(40) + '\n';
        text += `${section.content.replace(/<[^>]*>/g, '')}\n\n`;
      });
    }

    return text;
  }

  /**
   * Gets a summary of a policy
   */
  async getPolicySummary(params: PolicySummaryParams) {
    const { region, policyType, language } = params;

    const policy = policyRegistry[policyType];
    if (!policy) {
      throw new Error(`Policy not found: ${policyType}`);
    }

    const policyTypeConfig = POLICY_TYPES.find((p) => p.id === policyType);
    const regionConfig = SUPPORTED_REGIONS.find((r) => r.code === region);

    return {
      policyType: policyTypeConfig,
      region: regionConfig?.code || 'GLOBAL',
      language,
      version: policy.version,
      effectiveDate: policy.effectiveDate,
      summary: policy.summary,
      sectionCount: policy.sections?.length || 0,
      sections:
        policy.sections?.map((s: any) => ({
          id: s.id,
          title: s.title,
        })) || [],
      userRights: policy.userRights || [],
      contactInfo: policy.contactInfo,
    };
  }

  /**
   * Gets list of supported regions
   */
  async getSupportedRegions() {
    return SUPPORTED_REGIONS.map((region) => ({
      ...region,
      hasLocalizedContent: ['US', 'EU', 'UK', 'GLOBAL'].includes(region.code),
    }));
  }

  /**
   * Gets list of available policy types
   */
  async getPolicyTypes() {
    return POLICY_TYPES.map((type) => ({
      ...type,
      available: !!policyRegistry[type.id],
      currentVersion: policyRegistry[type.id]?.version || null,
      lastUpdated: policyRegistry[type.id]?.lastUpdated || null,
    }));
  }

  /**
   * Validates policy content
   */
  async validatePolicy(params: PolicyValidationParams) {
    const { content, region, policyType } = params;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic content validation
    if (!content || content.length < 100) {
      errors.push('Policy content is too short (minimum 100 characters)');
    }

    if (content.length > 500000) {
      errors.push('Policy content exceeds maximum length (500,000 characters)');
    }

    // Check for required sections based on region
    const regionConfig = SUPPORTED_REGIONS.find((r) => r.code === region);

    if (regionConfig?.regulations.includes('GDPR')) {
      const gdprRequirements = [
        { pattern: /data controller/i, message: 'Missing data controller information' },
        { pattern: /legal basis/i, message: 'Missing legal basis for processing' },
        { pattern: /data subject rights/i, message: 'Missing data subject rights section' },
        { pattern: /retention/i, message: 'Missing data retention information' },
      ];

      gdprRequirements.forEach((req) => {
        if (!req.pattern.test(content)) {
          warnings.push(`GDPR: ${req.message}`);
        }
      });
    }

    if (regionConfig?.regulations.includes('CCPA')) {
      const ccpaRequirements = [
        { pattern: /right to know/i, message: 'Missing right to know disclosure' },
        { pattern: /right to delete/i, message: 'Missing right to delete disclosure' },
        { pattern: /opt.out/i, message: 'Missing opt-out information' },
      ];

      ccpaRequirements.forEach((req) => {
        if (!req.pattern.test(content)) {
          warnings.push(`CCPA: ${req.message}`);
        }
      });
    }

    // Policy-specific validation
    if (policyType === 'privacy') {
      const privacyRequirements = [
        { pattern: /collect/i, message: 'Missing data collection disclosure' },
        { pattern: /share|third.part/i, message: 'Missing third-party sharing disclosure' },
        { pattern: /security/i, message: 'Missing security measures disclosure' },
        { pattern: /contact/i, message: 'Missing contact information' },
      ];

      privacyRequirements.forEach((req) => {
        if (!req.pattern.test(content)) {
          warnings.push(`Privacy Policy: ${req.message}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      compliance: {
        gdpr: regionConfig?.regulations.includes('GDPR')
          ? warnings.filter((w) => w.startsWith('GDPR')).length === 0
            ? 'compliant'
            : 'review-needed'
          : 'not-applicable',
        ccpa: regionConfig?.regulations.includes('CCPA')
          ? warnings.filter((w) => w.startsWith('CCPA')).length === 0
            ? 'compliant'
            : 'review-needed'
          : 'not-applicable',
      },
      analyzedAt: new Date().toISOString(),
    };
  }
}
