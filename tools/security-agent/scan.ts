#!/usr/bin/env ts-node
/**
 * Security Agent - Static Analysis Scanner
 *
 * Scans codebase for common security vulnerabilities:
 * - Mass assignment patterns
 * - Missing authorization
 * - ORM entity exposure
 * - Dangerous code patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface SecurityFinding {
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  rule: string;
  message: string;
  snippet: string;
  remediation: string;
}

interface ScanResult {
  findings: SecurityFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  passed: boolean;
}

// Security rules
const RULES = [
  {
    id: 'mass-assignment-update',
    pattern: /\.update\s*\(\s*[^,]+,\s*req\.body\s*\)/g,
    severity: 'critical' as const,
    message: 'Direct req.body in ORM update() allows mass assignment',
    remediation: 'Use a DTO to whitelist allowed fields before passing to update()',
  },
  {
    id: 'mass-assignment-create',
    pattern: /\.create\s*\(\s*req\.body\s*\)/g,
    severity: 'critical' as const,
    message: 'Direct req.body in ORM create() allows mass assignment',
    remediation: 'Use a DTO to whitelist allowed fields before passing to create()',
  },
  {
    id: 'spread-req-body',
    pattern: /\.\.\.\s*req\.body/g,
    severity: 'high' as const,
    message: 'Spreading req.body allows unintended field assignment',
    remediation: 'Explicitly destructure only the fields you expect',
  },
  {
    id: 'missing-auth-guard',
    pattern: /@(Get|Post|Put|Patch|Delete)\s*\([^)]*\)\s*\n\s*(?!.*@(Auth|UseGuards|Roles))/g,
    severity: 'high' as const,
    message: 'Route handler may be missing authentication guard',
    remediation: 'Add @UseGuards(AuthGuard) or @Auth() decorator',
  },
  {
    id: 'raw-entity-return',
    pattern: /return\s+(await\s+)?this\.\w+Repository\.(find|findOne|save|create)/g,
    severity: 'medium' as const,
    message: 'Returning raw ORM entity may expose internal fields',
    remediation: 'Map entity to DTO before returning',
  },
  {
    id: 'eval-usage',
    pattern: /\beval\s*\(/g,
    severity: 'critical' as const,
    message: 'eval() usage can lead to code injection',
    remediation: 'Remove eval() and use safer alternatives',
  },
  {
    id: 'sql-injection',
    pattern: /query\s*\(\s*[`'"]\s*SELECT.*\$\{/g,
    severity: 'critical' as const,
    message: 'String interpolation in SQL query may allow SQL injection',
    remediation: 'Use parameterized queries or ORM query builder',
  },
  {
    id: 'hardcoded-secret',
    pattern: /(password|secret|api_key|apiKey|token)\s*[=:]\s*['"][^'"]{8,}['"]/gi,
    severity: 'critical' as const,
    message: 'Hardcoded secret detected',
    remediation: 'Move secrets to environment variables',
  },
  {
    id: 'console-log-production',
    pattern: /console\.(log|debug|info)\s*\(/g,
    severity: 'low' as const,
    message: 'console.log in production code may leak sensitive info',
    remediation: 'Use proper logging library with log levels',
  },
  {
    id: 'stack-trace-exposure',
    pattern: /res\.(json|send)\s*\(\s*\{[^}]*error[^}]*stack/gi,
    severity: 'high' as const,
    message: 'Stack trace exposure in error response',
    remediation: 'Remove stack traces from client-facing error responses',
  },
  {
    id: 'missing-tenant-filter',
    pattern: /findOne\s*\(\s*\{\s*id:\s*\w+\s*\}\s*\)/g,
    severity: 'high' as const,
    message: 'Query by ID without tenant filter may allow IDOR',
    remediation: 'Add tenantId to the query filter',
  },
  {
    id: 'unsafe-cors',
    pattern: /cors\s*\(\s*\{\s*origin:\s*['"]\*['"]/g,
    severity: 'medium' as const,
    message: 'CORS allows all origins which may be insecure',
    remediation: 'Restrict CORS to specific trusted origins',
  },
];

async function scanFile(filePath: string): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const rule of RULES) {
    let match;
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);

    while ((match = regex.exec(content)) !== null) {
      // Calculate line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;

      findings.push({
        file: filePath,
        line: lineNumber,
        severity: rule.severity,
        rule: rule.id,
        message: rule.message,
        snippet: lines[lineNumber - 1]?.trim() || '',
        remediation: rule.remediation,
      });
    }
  }

  return findings;
}

async function scan(targetDir: string): Promise<ScanResult> {
  console.log(`\n🔍 Security Agent Scanning: ${targetDir}\n`);

  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: targetDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.test.*', '**/*.spec.*'],
    absolute: true,
  });

  console.log(`Found ${files.length} files to scan\n`);

  const allFindings: SecurityFinding[] = [];

  for (const file of files) {
    const findings = await scanFile(file);
    allFindings.push(...findings);
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  allFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const summary = {
    total: allFindings.length,
    critical: allFindings.filter(f => f.severity === 'critical').length,
    high: allFindings.filter(f => f.severity === 'high').length,
    medium: allFindings.filter(f => f.severity === 'medium').length,
    low: allFindings.filter(f => f.severity === 'low').length,
  };

  // Print findings
  if (allFindings.length > 0) {
    console.log('━'.repeat(80));
    console.log('SECURITY FINDINGS');
    console.log('━'.repeat(80));

    for (const finding of allFindings) {
      const severityColors: Record<string, string> = {
        critical: '\x1b[31m', // Red
        high: '\x1b[33m',     // Yellow
        medium: '\x1b[36m',   // Cyan
        low: '\x1b[90m',      // Gray
      };
      const reset = '\x1b[0m';
      const color = severityColors[finding.severity];

      console.log(`\n${color}[${finding.severity.toUpperCase()}]${reset} ${finding.rule}`);
      console.log(`  File: ${finding.file}:${finding.line}`);
      console.log(`  Message: ${finding.message}`);
      console.log(`  Snippet: ${finding.snippet}`);
      console.log(`  Remediation: ${finding.remediation}`);
    }
  }

  // Print summary
  console.log('\n' + '━'.repeat(80));
  console.log('SUMMARY');
  console.log('━'.repeat(80));
  console.log(`Total Findings: ${summary.total}`);
  console.log(`  Critical: ${summary.critical}`);
  console.log(`  High: ${summary.high}`);
  console.log(`  Medium: ${summary.medium}`);
  console.log(`  Low: ${summary.low}`);

  const passed = summary.critical === 0 && summary.high === 0;
  console.log(`\nStatus: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

  return {
    findings: allFindings,
    summary,
    passed,
  };
}

// Generate markdown report
function generateReport(result: ScanResult): string {
  let report = `# Security Scan Report

Generated: ${new Date().toISOString()}

## Summary

| Severity | Count |
|----------|-------|
| Critical | ${result.summary.critical} |
| High | ${result.summary.high} |
| Medium | ${result.summary.medium} |
| Low | ${result.summary.low} |
| **Total** | **${result.summary.total}** |

## Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}

`;

  if (result.findings.length > 0) {
    report += `## Findings

`;
    for (const finding of result.findings) {
      report += `### ${finding.severity.toUpperCase()}: ${finding.rule}

- **File:** \`${finding.file}:${finding.line}\`
- **Message:** ${finding.message}
- **Snippet:** \`${finding.snippet}\`
- **Remediation:** ${finding.remediation}

`;
    }
  } else {
    report += `## No security issues found!

`;
  }

  return report;
}

// Main execution
async function main() {
  const targetDir = process.argv[2] || process.cwd();

  try {
    const result = await scan(targetDir);

    // Write report
    const reportPath = path.join(targetDir, 'SECURITY', 'security-report.md');
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, generateReport(result));
    console.log(`\nReport written to: ${reportPath}`);

    // Exit with error if critical or high findings
    if (!result.passed) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Scan failed:', error);
    process.exit(1);
  }
}

main();
