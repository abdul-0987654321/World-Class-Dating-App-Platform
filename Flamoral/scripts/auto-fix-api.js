#!/usr/bin/env node

/**
 * Auto-Fix API Script for Flamoral Dating Platform
 *
 * This script parses test results from Jest/Newman and attempts automatic fixes
 * for common API issues including missing route handlers, type mismatches,
 * missing imports, and schema validation errors.
 *
 * Usage:
 *   node scripts/auto-fix-api.js [options]
 *
 * Options:
 *   --test-results <file>   Path to test results JSON file
 *   --dry-run              Show fixes without applying them
 *   --report <file>        Output fix report to file
 *   --verbose              Enable verbose logging
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AutoFixAPI {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      testResultsPath: options.testResultsPath || null,
      reportPath: options.reportPath || path.join(process.cwd(), 'auto-fix-report.json')
    };

    this.fixes = [];
    this.errors = [];
    this.stats = {
      totalIssues: 0,
      fixedIssues: 0,
      failedFixes: 0,
      skippedIssues: 0
    };
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🤖 Auto-Fix API System - Flamoral Dating Platform\n');

    try {
      // Step 1: Discover and analyze test results
      const testResults = await this.discoverTestResults();

      // Step 2: Analyze failing tests
      const issues = await this.analyzeFailures(testResults);

      // Step 3: Attempt automatic fixes
      await this.applyFixes(issues);

      // Step 4: Generate fix report
      await this.generateReport();

      // Step 5: Display summary
      this.displaySummary();

      return this.stats.failedFixes === 0;
    } catch (error) {
      console.error('❌ Auto-fix failed:', error.message);
      this.errors.push({ type: 'fatal', message: error.message, stack: error.stack });
      return false;
    }
  }

  /**
   * Discover test results from various sources
   */
  async discoverTestResults() {
    console.log('🔍 Discovering test results...\n');

    const results = {
      jest: [],
      newman: [],
      playwright: []
    };

    // Check for Jest test results
    const jestPaths = [
      'backend/coverage/coverage-summary.json',
      'backend/test-results.json',
      'test-results/jest-results.json'
    ];

    for (const jestPath of jestPaths) {
      const fullPath = path.join(process.cwd(), jestPath);
      if (fs.existsSync(fullPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          results.jest.push({ path: fullPath, data });
          console.log(`  ✓ Found Jest results: ${jestPath}`);
        } catch (error) {
          this.log(`  ⚠ Failed to parse Jest results from ${jestPath}`);
        }
      }
    }

    // Check for Newman (Postman) test results
    const newmanPaths = [
      'newman-results.json',
      'test-results/newman-results.json',
      'tests/newman-results.json'
    ];

    for (const newmanPath of newmanPaths) {
      const fullPath = path.join(process.cwd(), newmanPath);
      if (fs.existsSync(fullPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          results.newman.push({ path: fullPath, data });
          console.log(`  ✓ Found Newman results: ${newmanPath}`);
        } catch (error) {
          this.log(`  ⚠ Failed to parse Newman results from ${newmanPath}`);
        }
      }
    }

    console.log();
    return results;
  }

  /**
   * Analyze test failures and categorize issues
   */
  async analyzeFailures(testResults) {
    console.log('🔬 Analyzing test failures...\n');

    const issues = [];

    // Analyze Jest failures
    for (const jestResult of testResults.jest) {
      const jestIssues = this.analyzeJestFailures(jestResult.data);
      issues.push(...jestIssues);
    }

    // Analyze Newman failures
    for (const newmanResult of testResults.newman) {
      const newmanIssues = this.analyzeNewmanFailures(newmanResult.data);
      issues.push(...newmanIssues);
    }

    // Scan for common API issues
    const scanIssues = await this.scanForCommonIssues();
    issues.push(...scanIssues);

    this.stats.totalIssues = issues.length;
    console.log(`  Found ${issues.length} issues\n`);

    return issues;
  }

  /**
   * Analyze Jest test failures
   */
  analyzeJestFailures(data) {
    const issues = [];

    // Handle different Jest result formats
    if (data.testResults) {
      for (const testFile of data.testResults) {
        if (testFile.status === 'failed') {
          for (const test of testFile.assertionResults || []) {
            if (test.status === 'failed') {
              const issue = this.categorizeJestFailure(test, testFile);
              if (issue) issues.push(issue);
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * Categorize Jest test failure into fixable issue
   */
  categorizeJestFailure(test, testFile) {
    const failureMessage = test.failureMessages?.[0] || '';

    // Missing route handler
    if (failureMessage.includes('404') || failureMessage.includes('Cannot GET')) {
      return {
        type: 'missing_route',
        severity: 'high',
        test: test.fullName,
        file: testFile.name,
        message: failureMessage,
        route: this.extractRoute(failureMessage)
      };
    }

    // Type mismatch
    if (failureMessage.includes('Expected') && failureMessage.includes('but received')) {
      return {
        type: 'type_mismatch',
        severity: 'medium',
        test: test.fullName,
        file: testFile.name,
        message: failureMessage
      };
    }

    // Missing import
    if (failureMessage.includes('is not defined') || failureMessage.includes('Cannot find module')) {
      return {
        type: 'missing_import',
        severity: 'high',
        test: test.fullName,
        file: testFile.name,
        message: failureMessage,
        module: this.extractModule(failureMessage)
      };
    }

    // Schema validation error
    if (failureMessage.includes('ValidationError') || failureMessage.includes('schema')) {
      return {
        type: 'schema_validation',
        severity: 'medium',
        test: test.fullName,
        file: testFile.name,
        message: failureMessage
      };
    }

    return null;
  }

  /**
   * Analyze Newman (Postman) test failures
   */
  analyzeNewmanFailures(data) {
    const issues = [];

    if (data.run?.executions) {
      for (const execution of data.run.executions) {
        if (execution.assertions) {
          for (const assertion of execution.assertions) {
            if (assertion.error) {
              const issue = this.categorizeNewmanFailure(assertion, execution);
              if (issue) issues.push(issue);
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * Categorize Newman test failure
   */
  categorizeNewmanFailure(assertion, execution) {
    const error = assertion.error;
    const request = execution.request;

    // Missing endpoint
    if (error.name === 'AssertionError' && error.test?.includes('Status code')) {
      return {
        type: 'missing_endpoint',
        severity: 'high',
        endpoint: `${request.method} ${request.url.path?.join('/')}`,
        message: error.message
      };
    }

    // Response schema mismatch
    if (error.test?.includes('schema') || error.test?.includes('Schema')) {
      return {
        type: 'response_schema_mismatch',
        severity: 'medium',
        endpoint: `${request.method} ${request.url.path?.join('/')}`,
        message: error.message
      };
    }

    return null;
  }

  /**
   * Scan codebase for common API issues
   */
  async scanForCommonIssues() {
    console.log('  Scanning codebase for common issues...');
    const issues = [];

    try {
      // Scan for routes without validation
      const routeFiles = this.findFiles('backend/services/**/routes/*.ts');
      for (const file of routeFiles) {
        const content = fs.readFileSync(file, 'utf8');

        // Check for routes without validation middleware
        const routeMatches = content.matchAll(/router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/g);
        for (const match of routeMatches) {
          const [, method, route] = match;
          const routeLine = content.substring(0, match.index).split('\n').length;

          // Check if validation is present nearby
          const contextStart = Math.max(0, match.index - 200);
          const contextEnd = Math.min(content.length, match.index + 200);
          const context = content.substring(contextStart, contextEnd);

          if (!context.includes('validate') && !context.includes('validator')) {
            issues.push({
              type: 'missing_validation',
              severity: 'low',
              file: file,
              line: routeLine,
              route: `${method.toUpperCase()} ${route}`,
              message: 'Route defined without validation middleware'
            });
          }
        }
      }

      // Scan for controllers without error handling
      const controllerFiles = this.findFiles('backend/services/**/controllers/*.ts');
      for (const file of controllerFiles) {
        const content = fs.readFileSync(file, 'utf8');

        // Check for async functions without try-catch
        const asyncMatches = content.matchAll(/async\s+\w+\s*\([^)]*\)\s*{/g);
        for (const match of asyncMatches) {
          const functionStart = match.index;
          const functionEnd = this.findMatchingBrace(content, functionStart + match[0].length);
          const functionBody = content.substring(functionStart, functionEnd);

          if (!functionBody.includes('try') && !functionBody.includes('catch')) {
            const line = content.substring(0, match.index).split('\n').length;
            issues.push({
              type: 'missing_error_handling',
              severity: 'medium',
              file: file,
              line: line,
              message: 'Async function without error handling'
            });
          }
        }
      }

    } catch (error) {
      this.log(`  ⚠ Error scanning codebase: ${error.message}`);
    }

    return issues;
  }

  /**
   * Apply fixes for identified issues
   */
  async applyFixes(issues) {
    console.log('🔧 Applying fixes...\n');

    for (const issue of issues) {
      try {
        let fixed = false;

        switch (issue.type) {
          case 'missing_route':
            fixed = await this.fixMissingRoute(issue);
            break;
          case 'type_mismatch':
            fixed = await this.fixTypeMismatch(issue);
            break;
          case 'missing_import':
            fixed = await this.fixMissingImport(issue);
            break;
          case 'schema_validation':
            fixed = await this.fixSchemaValidation(issue);
            break;
          case 'missing_validation':
            fixed = await this.fixMissingValidation(issue);
            break;
          case 'missing_error_handling':
            fixed = await this.fixMissingErrorHandling(issue);
            break;
          default:
            this.stats.skippedIssues++;
            this.log(`  ⊘ Skipped: ${issue.type}`);
        }

        if (fixed) {
          this.stats.fixedIssues++;
          this.fixes.push({ ...issue, status: 'fixed' });
          console.log(`  ✓ Fixed: ${issue.type} in ${issue.file || issue.route || 'unknown'}`);
        } else {
          this.stats.skippedIssues++;
        }
      } catch (error) {
        this.stats.failedFixes++;
        this.errors.push({ issue, error: error.message });
        console.log(`  ✗ Failed to fix: ${issue.type} - ${error.message}`);
      }
    }

    console.log();
  }

  /**
   * Fix missing route handler
   */
  async fixMissingRoute(issue) {
    if (this.options.dryRun) {
      console.log(`  [DRY RUN] Would create route handler for ${issue.route}`);
      return false;
    }

    // Extract route information
    const routeParts = issue.route?.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/);
    if (!routeParts) return false;

    const [, method, routePath] = routeParts;

    this.log(`  Creating route handler: ${method} ${routePath}`);

    // This would require more context about the service structure
    // For now, log the recommended fix
    this.fixes.push({
      ...issue,
      recommendation: `Add route handler:\nrouter.${method.toLowerCase()}('${routePath}', async (req, res) => {\n  // Implementation needed\n  res.status(501).json({ error: 'Not implemented' });\n});`
    });

    return false; // Don't auto-create routes without more context
  }

  /**
   * Fix type mismatch
   */
  async fixTypeMismatch(issue) {
    if (this.options.dryRun) {
      console.log(`  [DRY RUN] Would fix type mismatch in ${issue.file}`);
      return false;
    }

    // Log recommendation
    this.fixes.push({
      ...issue,
      recommendation: 'Review type definitions and ensure consistency between expected and actual types'
    });

    return false;
  }

  /**
   * Fix missing import
   */
  async fixMissingImport(issue) {
    if (this.options.dryRun || !issue.file) {
      console.log(`  [DRY RUN] Would add import in ${issue.file}`);
      return false;
    }

    // Try to find the module in the project
    const moduleName = issue.module;
    if (!moduleName) return false;

    // This would require more sophisticated module resolution
    this.fixes.push({
      ...issue,
      recommendation: `Add import: import { ${moduleName} } from '...';`
    });

    return false;
  }

  /**
   * Fix schema validation error
   */
  async fixSchemaValidation(issue) {
    if (this.options.dryRun) {
      console.log(`  [DRY RUN] Would fix schema validation in ${issue.file}`);
      return false;
    }

    this.fixes.push({
      ...issue,
      recommendation: 'Review schema definition and ensure it matches the data structure'
    });

    return false;
  }

  /**
   * Fix missing validation middleware
   */
  async fixMissingValidation(issue) {
    if (this.options.dryRun || !issue.file) return false;

    // Add recommendation for validation
    this.fixes.push({
      ...issue,
      recommendation: `Add validation middleware:\nrouter.${issue.route.split(' ')[0].toLowerCase()}('${issue.route.split(' ')[1]}', validateRequest(schema), controller);`
    });

    return false;
  }

  /**
   * Fix missing error handling
   */
  async fixMissingErrorHandling(issue) {
    if (this.options.dryRun || !issue.file) return false;

    // Add recommendation for error handling
    this.fixes.push({
      ...issue,
      recommendation: 'Wrap async function body in try-catch block to handle errors properly'
    });

    return false;
  }

  /**
   * Generate comprehensive fix report
   */
  async generateReport() {
    console.log('📊 Generating fix report...\n');

    const report = {
      timestamp: new Date().toISOString(),
      summary: this.stats,
      fixes: this.fixes,
      errors: this.errors,
      recommendations: this.generateRecommendations()
    };

    if (!this.options.dryRun) {
      fs.writeFileSync(this.options.reportPath, JSON.stringify(report, null, 2));
      console.log(`  Report saved to: ${this.options.reportPath}\n`);
    }

    return report;
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations() {
    const recommendations = [];

    // Group issues by type
    const issuesByType = {};
    for (const fix of this.fixes) {
      issuesByType[fix.type] = (issuesByType[fix.type] || 0) + 1;
    }

    // Generate recommendations
    if (issuesByType.missing_route > 5) {
      recommendations.push({
        priority: 'high',
        message: 'High number of missing routes detected. Consider implementing a route generation script or reviewing API documentation.'
      });
    }

    if (issuesByType.missing_validation > 10) {
      recommendations.push({
        priority: 'medium',
        message: 'Many routes lack validation middleware. Implement consistent validation across all endpoints.'
      });
    }

    if (issuesByType.missing_error_handling > 5) {
      recommendations.push({
        priority: 'high',
        message: 'Multiple functions lack error handling. Consider using a global error handler middleware or error wrapper utility.'
      });
    }

    return recommendations;
  }

  /**
   * Display summary of fixes
   */
  displaySummary() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('                   FIX SUMMARY                        ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Issues Found:    ${this.stats.totalIssues}`);
    console.log(`Fixed Automatically:   ${this.stats.fixedIssues}`);
    console.log(`Failed to Fix:         ${this.stats.failedFixes}`);
    console.log(`Skipped/Manual:        ${this.stats.skippedIssues}`);
    console.log('═══════════════════════════════════════════════════════\n');

    if (this.errors.length > 0) {
      console.log('❌ ERRORS:');
      for (const error of this.errors) {
        console.log(`  - ${error.issue?.type || 'Unknown'}: ${error.error}`);
      }
      console.log();
    }

    if (this.fixes.length > 0) {
      console.log('💡 RECOMMENDATIONS:');
      for (const fix of this.fixes.slice(0, 5)) {
        if (fix.recommendation) {
          console.log(`  - ${fix.type}: ${fix.recommendation.split('\n')[0]}`);
        }
      }
      if (this.fixes.length > 5) {
        console.log(`  ... and ${this.fixes.length - 5} more (see report for details)`);
      }
      console.log();
    }
  }

  /**
   * Helper: Find files matching pattern
   */
  findFiles(pattern) {
    try {
      const glob = require('glob');
      return glob.sync(pattern, { cwd: process.cwd() });
    } catch (error) {
      // Fallback if glob is not available
      return [];
    }
  }

  /**
   * Helper: Find matching closing brace
   */
  findMatchingBrace(content, start) {
    let depth = 1;
    for (let i = start; i < content.length; i++) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') depth--;
      if (depth === 0) return i;
    }
    return content.length;
  }

  /**
   * Helper: Extract route from error message
   */
  extractRoute(message) {
    const match = message.match(/(GET|POST|PUT|PATCH|DELETE)\s+([^\s]+)/);
    return match ? `${match[1]} ${match[2]}` : null;
  }

  /**
   * Helper: Extract module name from error message
   */
  extractModule(message) {
    const match = message.match(/['"]([^'"]+)['"]\s+is not defined/) ||
                  message.match(/Cannot find module\s+['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }

  /**
   * Helper: Verbose logging
   */
  log(message) {
    if (this.options.verbose) {
      console.log(message);
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    testResultsPath: args.includes('--test-results') ? args[args.indexOf('--test-results') + 1] : null,
    reportPath: args.includes('--report') ? args[args.indexOf('--report') + 1] : undefined
  };

  const autoFix = new AutoFixAPI(options);
  autoFix.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = AutoFixAPI;
