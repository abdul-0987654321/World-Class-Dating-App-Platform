#!/usr/bin/env node
/**
 * Encryption Key Rotation Script
 *
 * This script rotates TOTP encryption keys for enhanced security.
 *
 * Usage:
 *   npm run rotate-key [command]
 *
 * Commands:
 *   start        - Start key rotation process
 *   status <id>  - Check status of rotation
 *   history      - View rotation history
 *   verify       - Verify all secrets can be decrypted
 *
 * Prerequisites:
 * 1. Backup your database
 * 2. Set new key in environment:
 *    - TOTP_ENCRYPTION_MASTER_KEY=<new_key>
 *    - TOTP_ENCRYPTION_KEY_SALT=<new_salt>
 *    - TOTP_ENCRYPTION_KEY_VERSION=<new_version>
 * 3. Keep old key accessible:
 *    - TOTP_ENCRYPTION_MASTER_KEY_OLD=<old_key>
 *    - TOTP_ENCRYPTION_KEY_SALT_OLD=<old_salt>
 *    - TOTP_ENCRYPTION_KEY_VERSION_OLD=<old_version>
 *
 * Example:
 *   npm run rotate-key start
 *   npm run rotate-key status abc-123-def
 *   npm run rotate-key verify
 */

import dotenv from 'dotenv';
import logger from '../utils/logger';
import encryptionKeyRotationService from '../domain/services/encryption-key-rotation.service';

// Load environment variables
dotenv.config();

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  try {
    switch (command) {
      case 'start':
        await startRotation();
        break;

      case 'status':
        if (!args[0]) {
          console.error('Error: Rotation ID required');
          console.error('Usage: npm run rotate-key status <rotation-id>');
          process.exit(1);
        }
        await checkStatus(args[0]);
        break;

      case 'history':
        await viewHistory();
        break;

      case 'verify':
        await verifyEncryption();
        break;

      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run "npm run rotate-key help" for usage information');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Script failed:', error);
    console.error('\nError:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function startRotation() {
  console.log('\n=== Starting Encryption Key Rotation ===\n');

  // Verify environment variables
  const requiredVars = [
    'TOTP_ENCRYPTION_MASTER_KEY',
    'TOTP_ENCRYPTION_KEY_SALT',
    'TOTP_ENCRYPTION_KEY_VERSION',
    'TOTP_ENCRYPTION_MASTER_KEY_OLD',
    'TOTP_ENCRYPTION_KEY_SALT_OLD',
    'TOTP_ENCRYPTION_KEY_VERSION_OLD',
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('\nPlease set these variables before running key rotation.');
    process.exit(1);
  }

  console.log('Environment variables verified');
  console.log(`Old key version: ${process.env.TOTP_ENCRYPTION_KEY_VERSION_OLD}`);
  console.log(`New key version: ${process.env.TOTP_ENCRYPTION_KEY_VERSION}`);
  console.log('');

  // Confirm
  if (process.env.NODE_ENV === 'production') {
    console.log('WARNING: Running in PRODUCTION environment!');
    console.log('Make sure you have backed up the database before proceeding.');
    console.log('');
  }

  const rotationId = await encryptionKeyRotationService.startKeyRotation();

  console.log('\n=== Key Rotation Completed ===\n');
  console.log(`Rotation ID: ${rotationId}`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Verify encryption: npm run rotate-key verify');
  console.log('2. Update environment variables (remove _OLD variables)');
  console.log('3. Restart all application instances');
  console.log('');
}

async function checkStatus(rotationId: string) {
  console.log('\n=== Rotation Status ===\n');

  const status = await encryptionKeyRotationService.getRotationStatus(rotationId);

  console.log(`ID:               ${status.id}`);
  console.log(`Old Key Version:  ${status.oldKeyVersion}`);
  console.log(`New Key Version:  ${status.newKeyVersion}`);
  console.log(`Records Migrated: ${status.recordsMigrated}`);
  console.log(`Status:           ${status.status}`);
  console.log(`Started At:       ${status.startedAt}`);
  console.log(`Completed At:     ${status.completedAt || 'N/A'}`);

  if (status.errorMessage) {
    console.log(`Error:            ${status.errorMessage}`);
  }

  console.log('');
}

async function viewHistory() {
  console.log('\n=== Rotation History ===\n');

  const history = await encryptionKeyRotationService.getRotationHistory();

  if (history.length === 0) {
    console.log('No rotation history found');
    return;
  }

  history.forEach((rotation, index) => {
    console.log(`${index + 1}. Rotation ${rotation.id}`);
    console.log(`   Old Version: ${rotation.oldKeyVersion} -> New Version: ${rotation.newKeyVersion}`);
    console.log(`   Status: ${rotation.status}`);
    console.log(`   Records: ${rotation.recordsMigrated}`);
    console.log(`   Date: ${rotation.startedAt}`);
    if (rotation.errorMessage) {
      console.log(`   Error: ${rotation.errorMessage}`);
    }
    console.log('');
  });
}

async function verifyEncryption() {
  console.log('\n=== Verifying Encryption ===\n');
  console.log('Checking all TOTP secrets can be decrypted...\n');

  const result = await encryptionKeyRotationService.verifyEncryption();

  console.log(`Total Records:   ${result.total}`);
  console.log(`Valid:           ${result.valid} (${((result.valid / result.total) * 100).toFixed(2)}%)`);
  console.log(`Invalid:         ${result.invalid}`);

  if (result.invalid > 0) {
    console.log('\nErrors:');
    result.errors.slice(0, 10).forEach(error => {
      console.log(`  - Record ${error.recordId} (User ${error.userId}): ${error.error}`);
    });

    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more errors`);
    }

    console.log('\nWARNING: Some records could not be decrypted!');
    console.log('This may indicate a key mismatch or data corruption.');
  } else {
    console.log('\nSUCCESS: All TOTP secrets can be decrypted correctly!');
  }

  console.log('');
}

function printHelp() {
  console.log(`
Encryption Key Rotation Script

Usage:
  npm run rotate-key [command]

Commands:
  start         Start key rotation process
  status <id>   Check status of a rotation
  history       View rotation history
  verify        Verify all secrets can be decrypted
  help          Show this help message

Prerequisites:
  1. Backup your database
  2. Set new key environment variables:
     - TOTP_ENCRYPTION_MASTER_KEY=<new_key>
     - TOTP_ENCRYPTION_KEY_SALT=<new_salt>
     - TOTP_ENCRYPTION_KEY_VERSION=<new_version>
  3. Keep old key accessible:
     - TOTP_ENCRYPTION_MASTER_KEY_OLD=<old_key>
     - TOTP_ENCRYPTION_KEY_SALT_OLD=<old_salt>
     - TOTP_ENCRYPTION_KEY_VERSION_OLD=<old_version>

Generate new keys:
  openssl rand -base64 48

Examples:
  npm run rotate-key start
  npm run rotate-key status abc-123-def
  npm run rotate-key verify
  npm run rotate-key history
`);
}

// Run main function
main();
