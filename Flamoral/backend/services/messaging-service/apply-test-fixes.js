#!/usr/bin/env node
/**
 * Script to apply test fixes for messaging-service
 * This script backs up and replaces test configuration files
 */

const fs = require('fs');
const path = require('path');

const files = [
  {
    original: 'jest.config.js',
    new: 'jest.config.new.js',
    backup: 'jest.config.js.backup'
  },
  {
    original: path.join('tests', 'setup.ts'),
    new: path.join('tests', 'setup.new.ts'),
    backup: path.join('tests', 'setup.ts.backup')
  },
  {
    original: path.join('tests', 'unit', 'message.service.test.ts'),
    new: path.join('tests', 'unit', 'message.service.new.test.ts'),
    backup: path.join('tests', 'unit', 'message.service.test.ts.backup')
  },
  {
    original: path.join('__tests__', 'integration', 'messaging.integration.test.ts'),
    new: path.join('__tests__', 'integration', 'messaging.integration.new.test.ts'),
    backup: path.join('__tests__', 'integration', 'messaging.integration.test.ts.backup')
  }
];

console.log('🔧 Applying test fixes for messaging-service...\n');

let successCount = 0;
let errorCount = 0;

files.forEach(({ original, new: newFile, backup }) => {
  try {
    // Check if new file exists
    if (!fs.existsSync(newFile)) {
      console.log(`⚠️  Skipping ${original} - new file not found: ${newFile}`);
      return;
    }

    // Backup original file if it exists
    if (fs.existsSync(original)) {
      fs.copyFileSync(original, backup);
      console.log(`✅ Backed up: ${original} → ${backup}`);
    }

    // Replace with new file
    fs.copyFileSync(newFile, original);
    console.log(`✅ Replaced: ${original} with ${newFile}`);

    successCount++;
  } catch (error) {
    console.error(`❌ Error processing ${original}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   ✅ Successfully updated: ${successCount} file(s)`);
if (errorCount > 0) {
  console.log(`   ❌ Errors: ${errorCount} file(s)`);
}

if (successCount > 0) {
  console.log(`\n✨ Test fixes applied successfully!`);
  console.log(`\nNext steps:`);
  console.log(`   1. Run: npm test`);
  console.log(`   2. Verify all tests pass or are properly skipped`);
  console.log(`\n💡 To rollback, restore from .backup files`);
} else {
  console.log(`\n⚠️  No files were updated. Please check that .new files exist.`);
  process.exit(1);
}
