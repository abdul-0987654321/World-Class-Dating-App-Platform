#!/usr/bin/env node

/**
 * Script to replace console.log statements with proper logger calls
 *
 * Usage:
 *   node scripts/replace-console-logs.js [path]
 *
 * Examples:
 *   node scripts/replace-console-logs.js apps/mobile-app/src
 *   node scripts/replace-console-logs.js apps/web-app/src
 *   node scripts/replace-console-logs.js backend/services
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Patterns to match console statements
const PATTERNS = {
  log: /console\.log\(/g,
  debug: /console\.debug\(/g,
  info: /console\.info\(/g,
  warn: /console\.warn\(/g,
  error: /console\.error\(/g,
};

// Replacement mappings
const REPLACEMENTS = {
  log: 'logger.debug(',
  debug: 'logger.debug(',
  info: 'logger.info(',
  warn: 'logger.warn(',
  error: 'logger.error(',
};

// Import statement to add
const LOGGER_IMPORTS = {
  typescript: "import logger from '@utils/logger';",
  javascript: "const logger = require('../utils/logger').default;",
};

/**
 * Check if file already has logger import
 */
function hasLoggerImport(content) {
  return (
    content.includes("from '@utils/logger'") ||
    content.includes("from './utils/logger'") ||
    content.includes("from '../utils/logger'") ||
    content.includes("require('./utils/logger')") ||
    content.includes("require('../utils/logger')")
  );
}

/**
 * Get relative path to logger
 */
function getLoggerImportPath(filePath, isTypeScript) {
  const depth = filePath.split('/').length - 1;
  const relativePath = '../'.repeat(depth) + 'utils/logger';

  if (isTypeScript) {
    return `import logger from '${relativePath}';`;
  } else {
    return `const logger = require('${relativePath}').default;`;
  }
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let replacementCount = 0;

    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');

    // Check if file has any console statements
    const hasConsoleStatements = Object.keys(PATTERNS).some(key =>
      PATTERNS[key].test(content)
    );

    if (!hasConsoleStatements) {
      return { path: filePath, modified: false, count: 0 };
    }

    // Replace console statements
    Object.keys(PATTERNS).forEach(key => {
      const pattern = new RegExp(PATTERNS[key].source, 'g');
      const matches = content.match(pattern);

      if (matches) {
        content = content.replace(pattern, REPLACEMENTS[key]);
        replacementCount += matches.length;
        modified = true;
      }
    });

    // Add logger import if not present and modifications were made
    if (modified && !hasLoggerImport(content)) {
      const importStatement = getLoggerImportPath(filePath, isTypeScript);

      // Add import after existing imports
      const importRegex = /^import .+ from .+;$/m;
      const requireRegex = /^const .+ = require\(.+\);$/m;

      if (importRegex.test(content)) {
        // Add after last import statement
        const lastImportIndex = content.lastIndexOf('import ');
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content =
          content.slice(0, nextLineIndex + 1) +
          importStatement +
          '\n' +
          content.slice(nextLineIndex + 1);
      } else if (requireRegex.test(content)) {
        // Add after last require statement
        const lastRequireIndex = content.lastIndexOf('require(');
        const nextLineIndex = content.indexOf('\n', lastRequireIndex);
        content =
          content.slice(0, nextLineIndex + 1) +
          importStatement +
          '\n' +
          content.slice(nextLineIndex + 1);
      } else {
        // Add at the beginning
        content = importStatement + '\n\n' + content;
      }
    }

    // Write back to file
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return { path: filePath, modified, count: replacementCount };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { path: filePath, modified: false, count: 0, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  const targetPath = process.argv[2] || 'apps/mobile-app/src';

  console.log(`\nReplacing console.log statements in: ${targetPath}\n`);

  // Find all TypeScript and JavaScript files
  const pattern = `${targetPath}/**/*.{ts,tsx,js,jsx}`;
  const files = await glob(pattern, {
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/logger.{ts,js}', // Don't modify logger itself
    ],
  });

  console.log(`Found ${files.length} files to process\n`);

  let totalModified = 0;
  let totalReplacements = 0;
  const results = [];

  for (const file of files) {
    const result = processFile(file);
    if (result.modified) {
      totalModified++;
      totalReplacements += result.count;
      results.push(result);
    }
  }

  // Print results
  console.log('\n=== Summary ===');
  console.log(`Total files processed: ${files.length}`);
  console.log(`Files modified: ${totalModified}`);
  console.log(`Total console statements replaced: ${totalReplacements}\n`);

  if (results.length > 0) {
    console.log('Modified files:');
    results.forEach(result => {
      console.log(`  - ${result.path} (${result.count} replacements)`);
    });
  }

  console.log('\nDone!\n');
}

main().catch(console.error);
