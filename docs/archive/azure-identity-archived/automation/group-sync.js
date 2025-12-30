// ============================================================================
// FLAMORAL GROUP SYNCHRONIZATION SERVICE
// Microsoft Graph API Integration for Group-Driven Authorization
// ============================================================================

const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  tenantId: process.env.B2C_TENANT_ID,
  clientId: process.env.AUTOMATION_CLIENT_ID,
  clientSecret: process.env.AUTOMATION_CLIENT_SECRET,
  groups: {
    // Subscription tiers (saas-* naming convention)
    'saas-free': process.env.GROUP_ID_SAAS_FREE,
    'saas-standard': process.env.GROUP_ID_SAAS_STANDARD,
    'saas-premium': process.env.GROUP_ID_SAAS_PREMIUM,
    // Feature/status groups
    'saas-verified': process.env.GROUP_ID_SAAS_VERIFIED,
    // Role groups
    'saas-moderator': process.env.GROUP_ID_SAAS_MODERATOR,
    'saas-operator': process.env.GROUP_ID_SAAS_OPERATOR,
    'saas-admin': process.env.GROUP_ID_SAAS_ADMIN,
    // Special status
    banned: process.env.GROUP_ID_BANNED
  }
};

// Validate configuration
function validateConfig() {
  const required = ['tenantId', 'clientId', 'clientSecret'];
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }

  const missingGroups = Object.entries(config.groups)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingGroups.length > 0) {
    console.warn(`Warning: Missing group IDs: ${missingGroups.join(', ')}`);
  }
}

// ============================================================================
// GRAPH CLIENT INITIALIZATION
// ============================================================================

let graphClient = null;

function getGraphClient() {
  if (graphClient) return graphClient;

  validateConfig();

  const credential = new ClientSecretCredential(
    config.tenantId,
    config.clientId,
    config.clientSecret
  );

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default']
  });

  graphClient = Client.initWithMiddleware({ authProvider });
  return graphClient;
}

// ============================================================================
// CORE GROUP OPERATIONS
// ============================================================================

/**
 * Add user to a group (idempotent)
 * @param {string} userId - User Object ID
 * @param {string} groupId - Group Object ID
 * @returns {Promise<{success: boolean, action: string, error?: string}>}
 */
async function addUserToGroup(userId, groupId) {
  const client = getGraphClient();

  try {
    // Check if already member
    const members = await client.api(`/groups/${groupId}/members`)
      .filter(`id eq '${userId}'`)
      .select('id')
      .get();

    if (members.value && members.value.length > 0) {
      console.log(`User ${userId} already in group ${groupId}`);
      return { success: true, action: 'already_member' };
    }

    // Add to group
    await client.api(`/groups/${groupId}/members/$ref`)
      .post({
        '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
      });

    console.log(`Added user ${userId} to group ${groupId}`);
    return { success: true, action: 'added' };

  } catch (error) {
    // Handle "already a member" error gracefully
    if (error.code === 'Request_BadRequest' && error.message?.includes('already exist')) {
      return { success: true, action: 'already_member' };
    }

    console.error(`Failed to add user ${userId} to group ${groupId}:`, error.message);
    return { success: false, action: 'failed', error: error.message };
  }
}

/**
 * Remove user from a group (idempotent)
 * @param {string} userId - User Object ID
 * @param {string} groupId - Group Object ID
 * @returns {Promise<{success: boolean, action: string, error?: string}>}
 */
async function removeUserFromGroup(userId, groupId) {
  const client = getGraphClient();

  try {
    await client.api(`/groups/${groupId}/members/${userId}/$ref`)
      .delete();

    console.log(`Removed user ${userId} from group ${groupId}`);
    return { success: true, action: 'removed' };

  } catch (error) {
    // Handle "not a member" error gracefully
    if (error.statusCode === 404) {
      console.log(`User ${userId} not in group ${groupId}`);
      return { success: true, action: 'not_member' };
    }

    console.error(`Failed to remove user ${userId} from group ${groupId}:`, error.message);
    return { success: false, action: 'failed', error: error.message };
  }
}

/**
 * Get user's current group memberships
 * @param {string} userId - User Object ID
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function getUserGroups(userId) {
  const client = getGraphClient();

  try {
    const result = await client.api(`/users/${userId}/memberOf`)
      .select('id,displayName')
      .get();

    return result.value
      .filter(item => item['@odata.type'] === '#microsoft.graph.group')
      .map(g => ({
        id: g.id,
        name: g.displayName
      }));
  } catch (error) {
    console.error(`Failed to get groups for user ${userId}:`, error.message);
    return [];
  }
}

/**
 * Check if user is member of a specific group
 * @param {string} userId - User Object ID
 * @param {string} groupId - Group Object ID
 * @returns {Promise<boolean>}
 */
async function isUserInGroup(userId, groupId) {
  const client = getGraphClient();

  try {
    const result = await client.api(`/groups/${groupId}/members`)
      .filter(`id eq '${userId}'`)
      .select('id')
      .get();

    return result.value && result.value.length > 0;
  } catch (error) {
    console.error(`Failed to check membership for user ${userId} in group ${groupId}:`, error.message);
    return false;
  }
}

// ============================================================================
// FLAMORAL-SPECIFIC OPERATIONS
// ============================================================================

/**
 * Handle new user signup - add to free tier
 * @param {string} userId - User Object ID
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function onUserSignup(userId) {
  console.log(`Processing signup for user ${userId}`);

  if (!config.groups['saas-free']) {
    throw new Error('GROUP_ID_SAAS_FREE not configured');
  }

  const result = await addUserToGroup(userId, config.groups['saas-free']);

  // Audit log
  await logAuditEvent({
    action: 'USER_SIGNUP',
    userId,
    groupId: config.groups['saas-free'],
    result
  });

  return { success: result.success, results: { addToSaasFree: result } };
}

/**
 * Handle subscription upgrade to standard tier (free -> standard)
 * @param {string} userId - User Object ID
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function onStandardUpgrade(userId) {
  console.log(`Processing standard upgrade for user ${userId}`);

  if (!config.groups['saas-free'] || !config.groups['saas-standard']) {
    throw new Error('GROUP_ID_SAAS_FREE or GROUP_ID_SAAS_STANDARD not configured');
  }

  // Remove from free tier
  const removeResult = await removeUserFromGroup(userId, config.groups['saas-free']);

  // Add to standard tier
  const addResult = await addUserToGroup(userId, config.groups['saas-standard']);

  const results = {
    removeFromSaasFree: removeResult,
    addToSaasStandard: addResult
  };

  // Audit log
  await logAuditEvent({
    action: 'STANDARD_UPGRADE',
    userId,
    results
  });

  return {
    success: removeResult.success && addResult.success,
    results
  };
}

/**
 * Handle subscription downgrade from standard tier (standard -> free)
 * @param {string} userId - User Object ID
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function onStandardDowngrade(userId) {
  console.log(`Processing standard downgrade for user ${userId}`);

  if (!config.groups['saas-free'] || !config.groups['saas-standard']) {
    throw new Error('GROUP_ID_SAAS_FREE or GROUP_ID_SAAS_STANDARD not configured');
  }

  // Remove from standard tier
  const removeResult = await removeUserFromGroup(userId, config.groups['saas-standard']);

  // Add back to free tier
  const addResult = await addUserToGroup(userId, config.groups['saas-free']);

  const results = {
    removeFromSaasStandard: removeResult,
    addToSaasFree: addResult
  };

  // Audit log
  await logAuditEvent({
    action: 'STANDARD_DOWNGRADE',
    userId,
    results
  });

  return {
    success: removeResult.success && addResult.success,
    results
  };
}

/**
 * Handle subscription upgrade to premium tier (standard -> premium or free -> premium)
 * @param {string} userId - User Object ID
 * @param {string} fromTier - The tier upgrading from ('saas-free' or 'saas-standard')
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function onPremiumUpgrade(userId, fromTier = 'saas-standard') {
  console.log(`Processing premium upgrade for user ${userId} from ${fromTier}`);

  if (!config.groups['saas-premium']) {
    throw new Error('GROUP_ID_SAAS_PREMIUM not configured');
  }

  const results = {};
  let allSuccess = true;

  // Remove from source tier (standard or free)
  if (fromTier === 'saas-standard' && config.groups['saas-standard']) {
    const removeStandard = await removeUserFromGroup(userId, config.groups['saas-standard']);
    results.removeFromSaasStandard = removeStandard;
    if (!removeStandard.success) allSuccess = false;
  } else if (fromTier === 'saas-free' && config.groups['saas-free']) {
    const removeFree = await removeUserFromGroup(userId, config.groups['saas-free']);
    results.removeFromSaasFree = removeFree;
    if (!removeFree.success) allSuccess = false;
  }

  // Add to premium tier
  const addResult = await addUserToGroup(userId, config.groups['saas-premium']);
  results.addToSaasPremium = addResult;
  if (!addResult.success) allSuccess = false;

  // Audit log
  await logAuditEvent({
    action: 'PREMIUM_UPGRADE',
    userId,
    fromTier,
    results
  });

  return {
    success: allSuccess,
    results
  };
}

/**
 * Handle subscription downgrade from premium (premium -> standard or premium -> free)
 * @param {string} userId - User Object ID
 * @param {string} toTier - The tier downgrading to ('saas-standard' or 'saas-free')
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function onPremiumDowngrade(userId, toTier = 'saas-standard') {
  console.log(`Processing premium downgrade for user ${userId} to ${toTier}`);

  if (!config.groups['saas-premium']) {
    throw new Error('GROUP_ID_SAAS_PREMIUM not configured');
  }

  const results = {};
  let allSuccess = true;

  // Remove from premium tier
  const removeResult = await removeUserFromGroup(userId, config.groups['saas-premium']);
  results.removeFromSaasPremium = removeResult;
  if (!removeResult.success) allSuccess = false;

  // Add to destination tier (standard or free)
  if (toTier === 'saas-standard' && config.groups['saas-standard']) {
    const addStandard = await addUserToGroup(userId, config.groups['saas-standard']);
    results.addToSaasStandard = addStandard;
    if (!addStandard.success) allSuccess = false;
  } else if (toTier === 'saas-free' && config.groups['saas-free']) {
    const addFree = await addUserToGroup(userId, config.groups['saas-free']);
    results.addToSaasFree = addFree;
    if (!addFree.success) allSuccess = false;
  }

  // Audit log
  await logAuditEvent({
    action: 'PREMIUM_DOWNGRADE',
    userId,
    toTier,
    results
  });

  return {
    success: allSuccess,
    results
  };
}

/**
 * Handle identity verification approval
 * @param {string} userId - User Object ID
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function onVerificationApproved(userId) {
  console.log(`Processing verification for user ${userId}`);

  if (!config.groups['saas-verified']) {
    throw new Error('GROUP_ID_SAAS_VERIFIED not configured');
  }

  const result = await addUserToGroup(userId, config.groups['saas-verified']);

  // Audit log
  await logAuditEvent({
    action: 'VERIFICATION_APPROVED',
    userId,
    groupId: config.groups['saas-verified'],
    result
  });

  return { success: result.success, results: { addToSaasVerified: result } };
}

/**
 * Handle verification revocation
 * @param {string} userId - User Object ID
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function onVerificationRevoked(userId) {
  console.log(`Processing verification revocation for user ${userId}`);

  if (!config.groups['saas-verified']) {
    throw new Error('GROUP_ID_SAAS_VERIFIED not configured');
  }

  const result = await removeUserFromGroup(userId, config.groups['saas-verified']);

  // Audit log
  await logAuditEvent({
    action: 'VERIFICATION_REVOKED',
    userId,
    groupId: config.groups['saas-verified'],
    result
  });

  return { success: result.success, results: { removeFromSaasVerified: result } };
}

/**
 * Handle user ban - remove from all groups, add to banned
 * @param {string} userId - User Object ID
 * @param {string} reason - Ban reason
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function onUserBanned(userId, reason) {
  console.log(`Processing ban for user ${userId}: ${reason}`);

  if (!config.groups.banned) {
    throw new Error('GROUP_ID_BANNED not configured');
  }

  const results = {};
  let allSuccess = true;

  // Remove from all access groups
  for (const [groupName, groupId] of Object.entries(config.groups)) {
    if (groupName !== 'banned' && groupId) {
      const result = await removeUserFromGroup(userId, groupId);
      results[`remove_${groupName}`] = result;
      if (!result.success) allSuccess = false;
    }
  }

  // Add to banned group
  const banResult = await addUserToGroup(userId, config.groups.banned);
  results.add_banned = banResult;
  if (!banResult.success) allSuccess = false;

  // Audit log
  await logAuditEvent({
    action: 'USER_BANNED',
    userId,
    reason,
    results
  });

  return { success: allSuccess, results };
}

/**
 * Handle ban lift - remove from banned, restore to free tier
 * @param {string} userId - User Object ID
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function onBanLifted(userId) {
  console.log(`Lifting ban for user ${userId}`);

  if (!config.groups.banned || !config.groups['saas-free']) {
    throw new Error('GROUP_ID_BANNED or GROUP_ID_SAAS_FREE not configured');
  }

  // Remove from banned
  const removeResult = await removeUserFromGroup(userId, config.groups.banned);

  // Add to free tier (default after ban lift)
  const addResult = await addUserToGroup(userId, config.groups['saas-free']);

  const results = {
    removeFromBanned: removeResult,
    addToSaasFree: addResult
  };

  // Audit log
  await logAuditEvent({
    action: 'BAN_LIFTED',
    userId,
    results
  });

  return {
    success: removeResult.success && addResult.success,
    results
  };
}

// ============================================================================
// RECONCILIATION (Self-Healing)
// ============================================================================

/**
 * Reconcile a single user's groups with their expected state
 * @param {string} userId - User Object ID
 * @param {string} expectedTier - Expected subscription tier ('saas-free', 'saas-standard', or 'saas-premium')
 * @param {boolean} isVerified - Whether user is verified
 * @param {boolean} isBanned - Whether user is banned
 * @returns {Promise<{userId: string, status: string, changes: Array}>}
 */
async function reconcileUser(userId, expectedTier, isVerified, isBanned) {
  console.log(`Reconciling user ${userId}`);

  const currentGroups = await getUserGroups(userId);
  const currentGroupIds = currentGroups.map(g => g.id);
  const changes = [];

  // Define all subscription tier groups
  const tierGroups = ['saas-free', 'saas-standard', 'saas-premium'];

  // If banned, ensure only in banned group
  if (isBanned) {
    if (!currentGroupIds.includes(config.groups.banned)) {
      changes.push(await addUserToGroup(userId, config.groups.banned));
    }
    // Remove from all other groups
    for (const [name, id] of Object.entries(config.groups)) {
      if (name !== 'banned' && id && currentGroupIds.includes(id)) {
        changes.push(await removeUserFromGroup(userId, id));
      }
    }
    return { userId, status: 'reconciled_banned', changes };
  }

  // Ensure correct tier group (user should only be in one tier)
  const expectedTierGroup = config.groups[expectedTier];

  // Add to expected tier if not already member
  if (expectedTierGroup && !currentGroupIds.includes(expectedTierGroup)) {
    changes.push(await addUserToGroup(userId, expectedTierGroup));
  }

  // Remove from other tier groups
  for (const tier of tierGroups) {
    if (tier !== expectedTier) {
      const otherTierGroup = config.groups[tier];
      if (otherTierGroup && currentGroupIds.includes(otherTierGroup)) {
        changes.push(await removeUserFromGroup(userId, otherTierGroup));
      }
    }
  }

  // Handle verification status
  if (config.groups['saas-verified']) {
    if (isVerified && !currentGroupIds.includes(config.groups['saas-verified'])) {
      changes.push(await addUserToGroup(userId, config.groups['saas-verified']));
    }
    if (!isVerified && currentGroupIds.includes(config.groups['saas-verified'])) {
      changes.push(await removeUserFromGroup(userId, config.groups['saas-verified']));
    }
  }

  // Ensure not in banned group if not banned
  if (config.groups.banned && currentGroupIds.includes(config.groups.banned)) {
    changes.push(await removeUserFromGroup(userId, config.groups.banned));
  }

  return { userId, status: 'reconciled', changes };
}

/**
 * Full platform reconciliation
 * @param {Array<{userId: string, tier: string, isVerified: boolean, isBanned: boolean}>} userData
 * @returns {Promise<Array>}
 */
async function reconcileAllUsers(userData) {
  console.log(`Starting full platform reconciliation for ${userData.length} users...`);

  const results = [];
  let processed = 0;

  for (const user of userData) {
    const result = await reconcileUser(
      user.userId,
      user.tier,
      user.isVerified,
      user.isBanned
    );
    results.push(result);
    processed++;

    // Progress logging
    if (processed % 100 === 0) {
      console.log(`Reconciliation progress: ${processed}/${userData.length}`);
    }

    // Rate limiting - avoid Graph API throttling
    await sleep(100);
  }

  console.log(`Reconciliation complete. Processed ${results.length} users.`);
  return results;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

async function logAuditEvent(event) {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    service: 'flamoral-group-sync',
    environment: process.env.ENVIRONMENT || 'unknown',
    ...event
  };

  // Log to console (structured JSON for log aggregation)
  console.log('AUDIT:', JSON.stringify(auditEntry));

  // TODO: Implement additional audit destinations
  // - Azure Log Analytics
  // - Azure Event Hub
  // - Database audit table
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Configuration
  config,
  validateConfig,

  // Core operations
  addUserToGroup,
  removeUserFromGroup,
  getUserGroups,
  isUserInGroup,

  // FLAMORAL operations - User lifecycle
  onUserSignup,

  // FLAMORAL operations - Tier transitions
  onStandardUpgrade,    // free -> standard
  onStandardDowngrade,  // standard -> free
  onPremiumUpgrade,     // standard/free -> premium
  onPremiumDowngrade,   // premium -> standard/free

  // FLAMORAL operations - Verification
  onVerificationApproved,
  onVerificationRevoked,

  // FLAMORAL operations - Moderation
  onUserBanned,
  onBanLifted,

  // Reconciliation
  reconcileUser,
  reconcileAllUsers,

  // Audit
  logAuditEvent
};
