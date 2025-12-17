#!/usr/bin/env node

/**
 * Policy Update Automation Script
 *
 * This script handles automated policy updates when legal changes are detected.
 * It monitors legal data sources, analyzes impacts, updates affected policies,
 * and manages the entire update lifecycle.
 *
 * Usage:
 *   node update-policies.js --mode [monitor|update|validate]
 *   node update-policies.js --mode monitor --sources all
 *   node update-policies.js --mode update --region us/california --policy privacy
 *   node update-policies.js --mode validate --file content/policies/us/california/privacy-policy.md
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { diffLines, diffWordsWithSpace } = require('diff');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const { OpenAI } = require('openai');
const semver = require('semver');

// Configuration
const config = {
  contentDir: path.join(__dirname, '../../content/policies'),
  monitoringConfig: path.join(__dirname, '../../backend/services/policy-service/config/monitoring-sources.json'),
  regionsConfig: path.join(__dirname, '../../backend/services/policy-service/config/regions.json'),
  openaiApiKey: process.env.OPENAI_API_KEY,
  legalApiKeys: JSON.parse(process.env.LEGAL_API_KEYS || '{}'),
  notificationEmail: process.env.NOTIFY_LEGAL_TEAM || 'legal@flamoral.com',
  approvalRequired: process.env.APPROVAL_REQUIRED !== 'false',
  databaseUrl: process.env.DATABASE_URL,
};

// Initialize OpenAI for AI-assisted updates
const openai = new OpenAI({ apiKey: config.openaiApiKey });

/**
 * Logger utility
 */
class Logger {
  static info(message, data = {}) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
  }

  static warn(message, data = {}) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data);
  }

  static error(message, error = null) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  }

  static success(message, data = {}) {
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`, data);
  }
}

/**
 * Policy file parser
 */
class PolicyParser {
  /**
   * Parse a policy markdown file with frontmatter
   */
  static async parsePolicy(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

      if (!match) {
        throw new Error('Invalid policy format: missing frontmatter');
      }

      const frontmatter = yaml.load(match[1]);
      const body = match[2];

      return { frontmatter, body, raw: content };
    } catch (error) {
      Logger.error(`Failed to parse policy: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Write policy with updated frontmatter and content
   */
  static async writePolicy(filePath, frontmatter, body) {
    const frontmatterYaml = yaml.dump(frontmatter, { lineWidth: -1 });
    const content = `---\n${frontmatterYaml}---\n${body}`;

    await fs.writeFile(filePath, content, 'utf-8');
    Logger.success(`Policy written: ${filePath}`);
  }

  /**
   * Validate policy frontmatter schema
   */
  static validateFrontmatter(frontmatter) {
    const required = ['title', 'region', 'type', 'version', 'last_updated', 'language', 'effective_date'];
    const missing = required.filter(field => !frontmatter[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required frontmatter fields: ${missing.join(', ')}`);
    }

    // Validate version format
    if (!semver.valid(frontmatter.version)) {
      throw new Error(`Invalid version format: ${frontmatter.version}`);
    }

    // Validate dates
    if (isNaN(Date.parse(frontmatter.last_updated))) {
      throw new Error(`Invalid last_updated date: ${frontmatter.last_updated}`);
    }

    if (isNaN(Date.parse(frontmatter.effective_date))) {
      throw new Error(`Invalid effective_date: ${frontmatter.effective_date}`);
    }

    return true;
  }
}

/**
 * Legal change monitoring service
 */
class ChangeMonitor {
  constructor() {
    this.sources = null;
  }

  /**
   * Load monitoring sources configuration
   */
  async loadSources() {
    try {
      const data = await fs.readFile(config.monitoringConfig, 'utf-8');
      this.sources = JSON.parse(data);
      Logger.info('Loaded monitoring sources', { count: this.sources.sources.length });
    } catch (error) {
      Logger.error('Failed to load monitoring sources', error);
      throw error;
    }
  }

  /**
   * Monitor a specific source for legal changes
   */
  async monitorSource(source) {
    Logger.info(`Monitoring source: ${source.name}`);

    try {
      let changes = [];

      switch (source.type) {
        case 'rss':
          changes = await this.monitorRSS(source);
          break;
        case 'api':
          changes = await this.monitorAPI(source);
          break;
        case 'scraper':
          changes = await this.monitorScraper(source);
          break;
        default:
          Logger.warn(`Unknown source type: ${source.type}`);
      }

      return changes;
    } catch (error) {
      Logger.error(`Failed to monitor source: ${source.name}`, error);
      return [];
    }
  }

  /**
   * Monitor RSS feed
   */
  async monitorRSS(source) {
    const response = await axios.get(source.url);
    const $ = cheerio.load(response.data, { xmlMode: true });
    const changes = [];

    $('item').each((i, item) => {
      const title = $(item).find('title').text();
      const link = $(item).find('link').text();
      const pubDate = $(item).find('pubDate').text();
      const description = $(item).find('description').text();

      // Check if item matches keywords
      const matchesKeywords = source.keywords.some(keyword =>
        title.toLowerCase().includes(keyword.toLowerCase()) ||
        description.toLowerCase().includes(keyword.toLowerCase())
      );

      if (matchesKeywords) {
        changes.push({
          source: source.id,
          jurisdiction: source.jurisdiction,
          title,
          link,
          pubDate: new Date(pubDate),
          description,
          type: 'rss',
        });
      }
    });

    Logger.info(`RSS feed checked: ${source.name}`, { changes: changes.length });
    return changes;
  }

  /**
   * Monitor API endpoint
   */
  async monitorAPI(source) {
    const apiKey = config.legalApiKeys[source.id];
    const headers = apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {};

    const response = await axios.get(source.url, { headers });
    const changes = [];

    // Source-specific parsing (would need to be customized per API)
    // This is a generic example
    if (response.data.results) {
      response.data.results.forEach(item => {
        const matchesKeywords = source.keywords.some(keyword =>
          JSON.stringify(item).toLowerCase().includes(keyword.toLowerCase())
        );

        if (matchesKeywords) {
          changes.push({
            source: source.id,
            jurisdiction: source.jurisdiction,
            title: item.title || item.name,
            link: item.url || item.link,
            pubDate: new Date(item.date || item.published_at),
            description: item.description || item.summary,
            type: 'api',
          });
        }
      });
    }

    Logger.info(`API checked: ${source.name}`, { changes: changes.length });
    return changes;
  }

  /**
   * Monitor via web scraping
   */
  async monitorScraper(source) {
    const response = await axios.get(source.url);
    const $ = cheerio.load(response.data);
    const changes = [];

    // Source-specific selectors (would need configuration)
    const selectors = source.selectors || {
      item: '.legislation-item',
      title: '.title',
      link: 'a',
      date: '.date',
      description: '.description',
    };

    $(selectors.item).each((i, item) => {
      const title = $(item).find(selectors.title).text().trim();
      const link = $(item).find(selectors.link).attr('href');
      const dateText = $(item).find(selectors.date).text().trim();
      const description = $(item).find(selectors.description).text().trim();

      const matchesKeywords = source.keywords.some(keyword =>
        title.toLowerCase().includes(keyword.toLowerCase()) ||
        description.toLowerCase().includes(keyword.toLowerCase())
      );

      if (matchesKeywords) {
        changes.push({
          source: source.id,
          jurisdiction: source.jurisdiction,
          title,
          link: link.startsWith('http') ? link : `${new URL(source.url).origin}${link}`,
          pubDate: new Date(dateText),
          description,
          type: 'scraper',
        });
      }
    });

    Logger.info(`Scraper checked: ${source.name}`, { changes: changes.length });
    return changes;
  }

  /**
   * Monitor all sources
   */
  async monitorAll() {
    if (!this.sources) {
      await this.loadSources();
    }

    const allChanges = [];

    for (const source of this.sources.sources) {
      // Check if monitoring interval has elapsed
      // (In production, this would check last monitoring timestamp from database)
      const changes = await this.monitorSource(source);
      allChanges.push(...changes);
    }

    Logger.success('Monitoring complete', { totalChanges: allChanges.length });
    return allChanges;
  }
}

/**
 * Policy impact analyzer
 */
class ImpactAnalyzer {
  /**
   * Analyze which policies are affected by a legal change
   */
  static async analyze(legalChange) {
    Logger.info('Analyzing impact', { jurisdiction: legalChange.jurisdiction });

    const affectedPolicies = [];

    // Map jurisdiction to regions
    const regions = await this.getAffectedRegions(legalChange.jurisdiction);

    // Determine policy types affected
    const policyTypes = this.determinePolicyTypes(legalChange);

    for (const region of regions) {
      for (const policyType of policyTypes) {
        const policyPath = path.join(config.contentDir, region, `${policyType}.md`);

        try {
          await fs.access(policyPath);
          affectedPolicies.push({
            region,
            policyType,
            path: policyPath,
          });
        } catch {
          // Policy doesn't exist for this region
        }
      }
    }

    Logger.info('Impact analysis complete', { affected: affectedPolicies.length });
    return affectedPolicies;
  }

  /**
   * Get regions affected by a jurisdiction
   */
  static async getAffectedRegions(jurisdiction) {
    const regions = [];

    // Map jurisdictions to region paths
    const jurisdictionMap = {
      'eu': ['eu'],
      'uk': ['uk'],
      'us': ['us/general'],
      'us/california': ['us/california'],
      'us/washington': ['us/washington'],
      'canada': ['canada'],
      'brazil': ['brazil'],
      'australia': ['australia'],
      'nigeria': ['nigeria'],
    };

    const mapped = jurisdictionMap[jurisdiction] || [];
    regions.push(...mapped);

    // Also check global if this is a major jurisdiction
    if (['eu', 'us', 'uk'].includes(jurisdiction)) {
      regions.push('global');
    }

    return regions;
  }

  /**
   * Determine which policy types are affected
   */
  static determinePolicyTypes(legalChange) {
    const types = new Set();

    const keywords = legalChange.title.toLowerCase() + ' ' + legalChange.description.toLowerCase();

    // Privacy-related keywords
    if (keywords.match(/privacy|data protection|personal information|gdpr|ccpa|cpra/)) {
      types.add('privacy-policy');
    }

    // Terms-related keywords
    if (keywords.match(/terms|contract|agreement|liability|dispute/)) {
      types.add('terms-of-service');
    }

    // Cookie-related keywords
    if (keywords.match(/cookie|tracking|analytics/)) {
      types.add('cookie-policy');
    }

    // Content/community keywords
    if (keywords.match(/content|moderation|community|harassment|hate speech/)) {
      types.add('community-guidelines');
      types.add('content-policy');
    }

    // Default to privacy if no specific match
    if (types.size === 0) {
      types.add('privacy-policy');
    }

    return Array.from(types);
  }
}

/**
 * AI-powered policy updater
 */
class PolicyUpdater {
  /**
   * Update policy content based on legal change
   */
  static async updatePolicy(policyPath, legalChange) {
    Logger.info(`Updating policy: ${policyPath}`);

    try {
      // Parse existing policy
      const policy = await PolicyParser.parsePolicy(policyPath);

      // Generate update using AI
      const update = await this.generateUpdate(policy, legalChange);

      // Create new version
      const newVersion = this.incrementVersion(policy.frontmatter.version, update.changeType);

      // Update frontmatter
      const newFrontmatter = {
        ...policy.frontmatter,
        version: newVersion,
        last_updated: new Date().toISOString().split('T')[0],
        supersedes: policy.frontmatter.version,
        change_summary: update.summary,
        affected_sections: update.affectedSections,
        legal_review: {
          status: 'pending',
          date: new Date().toISOString().split('T')[0],
        },
      };

      // Apply updates to body
      const newBody = await this.applyUpdates(policy.body, update.changes);

      // Save updated policy
      await PolicyParser.writePolicy(policyPath, newFrontmatter, newBody);

      // Archive old version
      await this.archiveVersion(policyPath, policy);

      Logger.success('Policy updated successfully', { newVersion });

      return {
        path: policyPath,
        oldVersion: policy.frontmatter.version,
        newVersion,
        summary: update.summary,
      };
    } catch (error) {
      Logger.error(`Failed to update policy: ${policyPath}`, error);
      throw error;
    }
  }

  /**
   * Generate policy update using AI
   */
  static async generateUpdate(policy, legalChange) {
    const prompt = `You are a legal policy expert. Analyze this legal change and determine how to update the policy.

Legal Change:
Title: ${legalChange.title}
Description: ${legalChange.description}
Jurisdiction: ${legalChange.jurisdiction}
Effective Date: ${legalChange.pubDate}

Current Policy:
${policy.frontmatter.title}
Version: ${policy.frontmatter.version}
Region: ${policy.frontmatter.region}

Policy Content:
${policy.body.substring(0, 5000)}...

Instructions:
1. Identify which sections of the policy are affected by this legal change
2. Generate specific updates for each affected section
3. Provide a summary of changes
4. Determine if this is a major, minor, or patch update

Respond in JSON format:
{
  "changeType": "major|minor|patch",
  "summary": "Brief summary of changes",
  "affectedSections": ["section-id-1", "section-id-2"],
  "changes": [
    {
      "section": "section-id",
      "type": "add|modify|remove",
      "content": "Updated content or instruction",
      "reason": "Explanation of why this change is needed"
    }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a legal compliance expert specializing in privacy and data protection law.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const update = JSON.parse(response.choices[0].message.content);
      return update;
    } catch (error) {
      Logger.error('AI update generation failed', error);
      throw error;
    }
  }

  /**
   * Apply updates to policy body
   */
  static async applyUpdates(body, changes) {
    let updatedBody = body;

    for (const change of changes) {
      if (change.type === 'modify') {
        // Use AI to apply the modification
        const prompt = `Update the following section according to the instruction:

Section: ${change.section}
Instruction: ${change.content}
Reason: ${change.reason}

Current content:
${this.extractSection(body, change.section)}

Provide only the updated section content, maintaining the same markdown formatting.`;

        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
          });

          const updatedSection = response.choices[0].message.content;
          updatedBody = this.replaceSection(updatedBody, change.section, updatedSection);
        } catch (error) {
          Logger.error(`Failed to update section: ${change.section}`, error);
        }
      } else if (change.type === 'add') {
        // Add new section
        updatedBody = this.addSection(updatedBody, change.section, change.content);
      } else if (change.type === 'remove') {
        // Remove section
        updatedBody = this.removeSection(updatedBody, change.section);
      }
    }

    return updatedBody;
  }

  /**
   * Extract a section from policy body
   */
  static extractSection(body, sectionId) {
    const regex = new RegExp(`## .* {#${sectionId}}([\\s\\S]*?)(?=## |$)`, 'm');
    const match = body.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Replace a section in policy body
   */
  static replaceSection(body, sectionId, newContent) {
    const regex = new RegExp(`(## .* {#${sectionId}})([\\s\\S]*?)(?=## |$)`, 'm');
    return body.replace(regex, `$1\n\n${newContent}\n\n`);
  }

  /**
   * Add a new section
   */
  static addSection(body, sectionId, content) {
    return body + `\n\n## ${content}\n\n`;
  }

  /**
   * Remove a section
   */
  static removeSection(body, sectionId) {
    const regex = new RegExp(`## .* {#${sectionId}}[\\s\\S]*?(?=## |$)`, 'm');
    return body.replace(regex, '');
  }

  /**
   * Increment version number
   */
  static incrementVersion(currentVersion, changeType) {
    switch (changeType) {
      case 'major':
        return semver.inc(currentVersion, 'major');
      case 'minor':
        return semver.inc(currentVersion, 'minor');
      case 'patch':
        return semver.inc(currentVersion, 'patch');
      default:
        return semver.inc(currentVersion, 'patch');
    }
  }

  /**
   * Archive old version
   */
  static async archiveVersion(policyPath, policy) {
    const archiveDir = path.join(path.dirname(policyPath), 'archive');
    await fs.mkdir(archiveDir, { recursive: true });

    const archivePath = path.join(
      archiveDir,
      `${path.basename(policyPath, '.md')}-v${policy.frontmatter.version}.md`
    );

    await fs.writeFile(archivePath, policy.raw, 'utf-8');
    Logger.info('Version archived', { path: archivePath });
  }
}

/**
 * Main orchestrator
 */
class PolicyMaintenanceEngine {
  constructor() {
    this.monitor = new ChangeMonitor();
  }

  /**
   * Run monitoring workflow
   */
  async runMonitoring() {
    Logger.info('Starting monitoring workflow');

    try {
      const changes = await this.monitor.monitorAll();

      if (changes.length === 0) {
        Logger.info('No legal changes detected');
        return;
      }

      Logger.success(`Detected ${changes.length} legal changes`);

      // Process each change
      for (const change of changes) {
        await this.processLegalChange(change);
      }
    } catch (error) {
      Logger.error('Monitoring workflow failed', error);
    }
  }

  /**
   * Process a detected legal change
   */
  async processLegalChange(legalChange) {
    Logger.info('Processing legal change', { title: legalChange.title });

    try {
      // Analyze impact
      const affectedPolicies = await ImpactAnalyzer.analyze(legalChange);

      if (affectedPolicies.length === 0) {
        Logger.info('No policies affected by this change');
        return;
      }

      // Update each affected policy
      const updates = [];
      for (const policy of affectedPolicies) {
        const result = await PolicyUpdater.updatePolicy(policy.path, legalChange);
        updates.push(result);
      }

      // Send notification
      await this.notifyLegalTeam(legalChange, updates);

      Logger.success('Legal change processed', { updates: updates.length });
    } catch (error) {
      Logger.error('Failed to process legal change', error);
    }
  }

  /**
   * Notify legal team of updates
   */
  async notifyLegalTeam(legalChange, updates) {
    const message = {
      subject: `Policy Update Required: ${legalChange.title}`,
      body: `
A legal change has been detected that affects ${updates.length} policy document(s).

Legal Change:
- Source: ${legalChange.source}
- Jurisdiction: ${legalChange.jurisdiction}
- Title: ${legalChange.title}
- Link: ${legalChange.link}
- Date: ${legalChange.pubDate}

Affected Policies:
${updates.map(u => `- ${u.path} (${u.oldVersion} → ${u.newVersion}): ${u.summary}`).join('\n')}

Please review these updates in the policy management system and approve for publication.
      `,
    };

    // In production, this would send an actual email
    Logger.info('Notification sent to legal team', { to: config.notificationEmail });
    console.log(message);
  }

  /**
   * Validate a policy file
   */
  async validatePolicy(filePath) {
    Logger.info(`Validating policy: ${filePath}`);

    try {
      const policy = await PolicyParser.parsePolicy(filePath);
      PolicyParser.validateFrontmatter(policy.frontmatter);
      Logger.success('Policy is valid');
      return true;
    } catch (error) {
      Logger.error('Policy validation failed', error);
      return false;
    }
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'monitor';

  const engine = new PolicyMaintenanceEngine();

  switch (mode) {
    case 'monitor':
      Logger.info('Running in monitoring mode');
      await engine.runMonitoring();
      break;

    case 'validate':
      const file = args.find(arg => arg.startsWith('--file='))?.split('=')[1];
      if (!file) {
        Logger.error('Missing --file argument');
        process.exit(1);
      }
      await engine.validatePolicy(file);
      break;

    case 'schedule':
      Logger.info('Starting scheduled monitoring');
      // Run every 6 hours
      cron.schedule('0 */6 * * *', async () => {
        await engine.runMonitoring();
      });
      Logger.info('Scheduler running. Press Ctrl+C to stop.');
      break;

    default:
      Logger.error(`Unknown mode: ${mode}`);
      console.log('Usage: node update-policies.js --mode=[monitor|validate|schedule]');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    Logger.error('Fatal error', error);
    process.exit(1);
  });
}

module.exports = {
  PolicyParser,
  ChangeMonitor,
  ImpactAnalyzer,
  PolicyUpdater,
  PolicyMaintenanceEngine,
};
