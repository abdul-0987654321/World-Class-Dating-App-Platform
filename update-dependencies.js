const fs = require('fs');
const path = require('path');

// Service updates configuration
const updates = {
  'backend/services/messaging-service': { addAxios: true, addKnex: true, addShared: true },
  'backend/services/advertising-service': { addAxios: false, addKnex: false, addShared: true },
  'backend/services/analytics-service': { addAxios: false, addKnex: true, addShared: true },
  'backend/services/api-gateway': { addAxios: false, addKnex: false, addShared: true },
  'backend/services/auth-service': { addAxios: false, addKnex: true, addShared: true },
  'backend/services/matching-service': { addAxios: false, addKnex: false, addShared: true },
  'backend/services/media-service': { addAxios: true, addKnex: false, addShared: true },
  'backend/services/moderation-service': { addAxios: false, addKnex: false, addShared: true },
  'backend/services/notification-service': { addAxios: false, addKnex: false, addShared: true },
  'backend/services/payment-service': { addAxios: false, addKnex: false, addShared: true },
  'backend/services/user-service': { addAxios: true, addKnex: false, addShared: true }
};

console.log('Starting dependency updates...\n');

Object.entries(updates).forEach(([servicePath, config]) => {
  try {
    const pkgPath = path.join(servicePath, 'package.json');
    const fullPath = path.resolve(pkgPath);

    console.log(`Processing: ${servicePath}`);

    // Read package.json
    const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    let modified = false;

    // Ensure dependencies object exists
    if (!pkg.dependencies) {
      pkg.dependencies = {};
    }

    // Add @flamoral/shared
    if (config.addShared && !pkg.dependencies['@flamoral/shared']) {
      // Create new dependencies object with @flamoral/shared first
      const newDeps = { '@flamoral/shared': '*' };
      Object.keys(pkg.dependencies).forEach(key => {
        newDeps[key] = pkg.dependencies[key];
      });
      pkg.dependencies = newDeps;
      console.log('  ✓ Added @flamoral/shared');
      modified = true;
    }

    // Add axios if needed
    if (config.addAxios && !pkg.dependencies['axios']) {
      pkg.dependencies['axios'] = '^1.6.2';
      console.log('  ✓ Added axios');
      modified = true;
    }

    // Add knex if needed
    if (config.addKnex && !pkg.dependencies['knex']) {
      pkg.dependencies['knex'] = '^3.1.0';
      console.log('  ✓ Added knex');
      modified = true;
    }

    // Write back to file
    if (modified) {
      fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      console.log(`  → Updated ${servicePath}/package.json\n`);
    } else {
      console.log(`  → No changes needed\n`);
    }
  } catch (error) {
    console.error(`  ✗ Error updating ${servicePath}:`, error.message, '\n');
  }
});

console.log('Dependency updates complete!');
console.log('\nSummary of changes:');
console.log('- Added @flamoral/shared to all 11 backend services');
console.log('- Added axios to: messaging-service, media-service, user-service');
console.log('- Added knex to: messaging-service, analytics-service, auth-service');
