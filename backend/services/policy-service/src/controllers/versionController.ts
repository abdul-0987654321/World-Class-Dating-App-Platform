/**
 * Version Controller
 * Handles policy version management and comparison
 */

import { privacyPolicy } from '../../policies/privacy-policy';
import { termsOfService } from '../../policies/terms-of-service';
import { trustSafetyPolicy } from '../../policies/trust-safety-policy';

// Policy registry
const policyRegistry: Record<string, any> = {
  'privacy': privacyPolicy,
  'terms': termsOfService,
  'trust-safety': trustSafetyPolicy,
};

// Version history storage
interface VersionEntry {
  version: string;
  publishedAt: string;
  changedBy: string;
  changes: string;
  changeType: 'major' | 'minor' | 'patch';
  sections?: string[];
  content?: any;
}

const versionHistory: Map<string, VersionEntry[]> = new Map();

// Audit log storage
interface AuditEntry {
  id: string;
  timestamp: string;
  action: 'view' | 'create' | 'update' | 'publish' | 'archive' | 'compare';
  policyType: string;
  version?: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

const auditLog: AuditEntry[] = [];
let auditIdCounter = 0;

// Initialize version history
Object.entries(policyRegistry).forEach(([type, policy]) => {
  if (policy?.version) {
    const versions: VersionEntry[] = [
      {
        version: policy.version,
        publishedAt: policy.effectiveDate || new Date().toISOString(),
        changedBy: 'system',
        changes: 'Current active version',
        changeType: 'major',
        sections: policy.sections?.map((s: any) => s.id) || [],
        content: policy,
      },
    ];

    // Add mock historical versions for demonstration
    const [major, minor, patch] = policy.version.split('.').map(Number);
    if (major > 1 || minor > 0) {
      versions.push({
        version: `${major}.${Math.max(0, minor - 1)}.0`,
        publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        changedBy: 'legal-team',
        changes: 'Updated data retention policies',
        changeType: 'minor',
        sections: ['data-retention', 'user-rights'],
      });
    }
    if (major > 1) {
      versions.push({
        version: `${major - 1}.0.0`,
        publishedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        changedBy: 'legal-team',
        changes: 'Major policy overhaul for GDPR compliance',
        changeType: 'major',
        sections: ['all'],
      });
    }

    versionHistory.set(type, versions);
  }
});

export interface VersionHistoryParams {
  region: string;
  policyType: string;
  limit: number;
  offset: number;
}

export interface VersionCompareParams {
  region: string;
  policyType: string;
  version1: string;
  version2: string;
  format: string;
}

export interface AuditLogParams {
  policyType?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
  auditLog.unshift({
    ...entry,
    id: `audit-${++auditIdCounter}`,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 10000 entries
  if (auditLog.length > 10000) {
    auditLog.pop();
  }
}

export class VersionController {
  /**
   * Gets version history for a policy
   */
  async getVersionHistory(params: VersionHistoryParams) {
    const { region, policyType, limit, offset } = params;

    const history = versionHistory.get(policyType);
    if (!history) {
      throw new Error(`No version history found for policy: ${policyType}`);
    }

    // Log audit
    logAudit({
      action: 'view',
      policyType,
      details: { action: 'version_history', region },
    });

    // Paginate results
    const total = history.length;
    const paginatedHistory = history.slice(offset, offset + limit);

    return {
      policyType,
      region,
      versions: paginatedHistory.map(v => ({
        version: v.version,
        publishedAt: v.publishedAt,
        changedBy: v.changedBy,
        changes: v.changes,
        changeType: v.changeType,
        sectionsModified: v.sections,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      currentVersion: policyRegistry[policyType]?.version || null,
    };
  }

  /**
   * Compares two versions of a policy
   */
  async compareVersions(params: VersionCompareParams) {
    const { region, policyType, version1, version2, format } = params;

    const history = versionHistory.get(policyType);
    if (!history) {
      throw new Error(`No version history found for policy: ${policyType}`);
    }

    const v1Entry = history.find(v => v.version === version1);
    const v2Entry = history.find(v => v.version === version2);

    if (!v1Entry) {
      throw new Error(`Version ${version1} not found for policy ${policyType}`);
    }
    if (!v2Entry) {
      throw new Error(`Version ${version2} not found for policy ${policyType}`);
    }

    // Log audit
    logAudit({
      action: 'compare',
      policyType,
      details: { version1, version2, format },
    });

    // Compare versions
    const v1Sections = new Set(v1Entry.sections || []);
    const v2Sections = new Set(v2Entry.sections || []);

    const addedSections = [...v2Sections].filter(s => !v1Sections.has(s));
    const removedSections = [...v1Sections].filter(s => !v2Sections.has(s));
    const modifiedSections = [...v1Sections].filter(s => v2Sections.has(s));

    const comparison = {
      policyType,
      region,
      version1: {
        version: v1Entry.version,
        publishedAt: v1Entry.publishedAt,
        changedBy: v1Entry.changedBy,
      },
      version2: {
        version: v2Entry.version,
        publishedAt: v2Entry.publishedAt,
        changedBy: v2Entry.changedBy,
      },
      differences: {
        sectionsAdded: addedSections,
        sectionsRemoved: removedSections,
        sectionsModified: modifiedSections,
        changesSummary: this.generateChangesSummary(v1Entry, v2Entry),
      },
      timeline: {
        daysBetween: Math.floor(
          (new Date(v2Entry.publishedAt).getTime() - new Date(v1Entry.publishedAt).getTime()) /
          (1000 * 60 * 60 * 24)
        ),
      },
    };

    // Format based on requested format
    if (format === 'html') {
      return {
        ...comparison,
        formatted: this.formatComparisonAsHtml(comparison),
      };
    } else if (format === 'markdown') {
      return {
        ...comparison,
        formatted: this.formatComparisonAsMarkdown(comparison),
      };
    }

    return comparison;
  }

  private generateChangesSummary(v1: VersionEntry, v2: VersionEntry): string[] {
    const changes: string[] = [];

    if (v2.changeType === 'major') {
      changes.push('Major policy revision with significant changes');
    } else if (v2.changeType === 'minor') {
      changes.push('Minor updates and clarifications');
    } else {
      changes.push('Patch for typos or formatting');
    }

    changes.push(v2.changes);

    return changes;
  }

  private formatComparisonAsHtml(comparison: any): string {
    return `
      <div class="version-comparison">
        <h2>Policy Version Comparison</h2>
        <div class="versions">
          <div class="version-old">
            <h3>Version ${comparison.version1.version}</h3>
            <p>Published: ${comparison.version1.publishedAt}</p>
          </div>
          <div class="version-new">
            <h3>Version ${comparison.version2.version}</h3>
            <p>Published: ${comparison.version2.publishedAt}</p>
          </div>
        </div>
        <div class="changes">
          <h3>Changes</h3>
          <ul>
            ${comparison.differences.changesSummary.map((c: string) => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  private formatComparisonAsMarkdown(comparison: any): string {
    return `
# Policy Version Comparison

## Version ${comparison.version1.version} → ${comparison.version2.version}

**Published:** ${comparison.version1.publishedAt} → ${comparison.version2.publishedAt}

### Changes
${comparison.differences.changesSummary.map((c: string) => `- ${c}`).join('\n')}

### Sections Modified
${comparison.differences.sectionsModified.map((s: string) => `- ${s}`).join('\n') || 'None'}

### Sections Added
${comparison.differences.sectionsAdded.map((s: string) => `- ${s}`).join('\n') || 'None'}

### Sections Removed
${comparison.differences.sectionsRemoved.map((s: string) => `- ${s}`).join('\n') || 'None'}
    `.trim();
  }

  /**
   * Gets audit log entries
   */
  async getAuditLog(params: AuditLogParams) {
    const {
      policyType,
      action,
      userId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = params;

    let filteredLog = [...auditLog];

    // Apply filters
    if (policyType) {
      filteredLog = filteredLog.filter(e => e.policyType === policyType);
    }
    if (action) {
      filteredLog = filteredLog.filter(e => e.action === action);
    }
    if (userId) {
      filteredLog = filteredLog.filter(e => e.userId === userId);
    }
    if (startDate) {
      const start = new Date(startDate);
      filteredLog = filteredLog.filter(e => new Date(e.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filteredLog = filteredLog.filter(e => new Date(e.timestamp) <= end);
    }

    // Paginate
    const total = filteredLog.length;
    const paginatedLog = filteredLog.slice(offset, offset + limit);

    return {
      entries: paginatedLog,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      filters: {
        policyType,
        action,
        userId,
        startDate,
        endDate,
      },
    };
  }
}

// Export for adding audit entries from other controllers
export { logAudit };
