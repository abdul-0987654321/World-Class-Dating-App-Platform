#!/usr/bin/env node
/**
 * FLAMORAL Layout Regression Guard
 *
 * Scans component directories for potentially problematic CSS patterns that
 * could cause layout issues. Fails CI if violations are found.
 *
 * Forbidden patterns in structural components:
 * - position: absolute on layout-critical elements
 * - width: 100vw inside constrained containers
 * - margin-left: -50vw or similar viewport hacks
 * - transform: translate used for centering structural elements
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Directories to scan (relative to project root)
const SCAN_DIRECTORIES = [
  'src/pages/**/*.{tsx,jsx,css}',
  'src/components/**/*.{tsx,jsx,css}',
];

// Allowed files that can use these patterns (e.g., decorative components)
const ALLOWED_FILES = [
  '**/AIAvatar*.tsx',
  '**/Background*.tsx',
  '**/Decoration*.tsx',
  '**/animations/**',
];

// Problematic patterns to detect
const PROBLEMATIC_PATTERNS = [
  {
    name: 'position-absolute-in-layout',
    pattern: /position\s*:\s*absolute/gi,
    message: 'position: absolute detected - use flex/grid for layout instead',
    severity: 'warning', // warning instead of error for gradual migration
  },
  {
    name: 'viewport-width-hack',
    pattern: /width\s*:\s*100vw/gi,
    message: 'width: 100vw can cause horizontal scroll - use 100% or max-width instead',
    severity: 'error',
  },
  {
    name: 'negative-margin-viewport',
    pattern: /margin-left\s*:\s*-50vw/gi,
    message: 'Negative viewport margin hack detected - refactor to container-based centering',
    severity: 'error',
  },
  {
    name: 'transform-translate-centering',
    pattern: /transform\s*:.*translate\s*\(\s*-50%/gi,
    message: 'Transform-based centering on layout elements - use flexbox centering instead',
    severity: 'warning',
  },
  {
    name: 'fixed-width-container',
    pattern: /width\s*:\s*\d{4,}px/gi,
    message: 'Fixed pixel width over 1000px - use max-width and responsive units',
    severity: 'warning',
  },
];

function isAllowedFile(filePath) {
  return ALLOWED_FILES.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(filePath);
  });
}

function scanFile(filePath) {
  const violations = [];
  const content = fs.readFileSync(filePath, 'utf8');

  if (isAllowedFile(filePath)) {
    return violations;
  }

  for (const rule of PROBLEMATIC_PATTERNS) {
    const matches = content.match(rule.pattern);
    if (matches) {
      matches.forEach((match, index) => {
        // Find line number
        const lines = content.split('\n');
        let lineNumber = 1;
        let charCount = 0;
        const matchIndex = content.indexOf(match);

        for (let i = 0; i < lines.length; i++) {
          charCount += lines[i].length + 1;
          if (charCount > matchIndex) {
            lineNumber = i + 1;
            break;
          }
        }

        violations.push({
          file: filePath,
          line: lineNumber,
          rule: rule.name,
          message: rule.message,
          severity: rule.severity,
          match: match.trim(),
        });
      });
    }
  }

  return violations;
}

function main() {
  console.log('\\n🔍 FLAMORAL Layout Regression Guard\\n');
  console.log('Scanning for potentially problematic layout patterns...\\n');

  const projectRoot = path.resolve(__dirname, '..');
  let allViolations = [];
  let filesScanned = 0;

  for (const pattern of SCAN_DIRECTORIES) {
    const files = glob.sync(path.join(projectRoot, pattern));

    for (const file of files) {
      if (file.includes('node_modules')) continue;

      filesScanned++;
      const violations = scanFile(file);
      allViolations = allViolations.concat(violations);
    }
  }

  console.log(`Scanned ${filesScanned} files\\n`);

  if (allViolations.length === 0) {
    console.log('✅ No layout regression issues found!\\n');
    process.exit(0);
  }

  // Group by severity
  const errors = allViolations.filter(v => v.severity === 'error');
  const warnings = allViolations.filter(v => v.severity === 'warning');

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\\n');
    warnings.forEach(v => {
      const relativePath = path.relative(projectRoot, v.file);
      console.log(`  ${relativePath}:${v.line}`);
      console.log(`    Rule: ${v.rule}`);
      console.log(`    ${v.message}`);
      console.log(`    Found: "${v.match}"\\n`);
    });
  }

  if (errors.length > 0) {
    console.log('❌ ERRORS:\\n');
    errors.forEach(v => {
      const relativePath = path.relative(projectRoot, v.file);
      console.log(`  ${relativePath}:${v.line}`);
      console.log(`    Rule: ${v.rule}`);
      console.log(`    ${v.message}`);
      console.log(`    Found: "${v.match}"\\n`);
    });
  }

  console.log(`\\nSummary: ${errors.length} errors, ${warnings.length} warnings\\n`);

  // Fail CI only on errors, not warnings
  if (errors.length > 0) {
    console.log('❌ Layout regression check FAILED - fix errors before merging\\n');
    process.exit(1);
  } else {
    console.log('⚠️  Layout check passed with warnings - consider fixing them\\n');
    process.exit(0);
  }
}

main();
