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
    free: process.env.GROUP_ID_FREE,
    premium: process.env.GROUP_ID_PREMIUM,
    verified: process.env.GROUP_ID_VERIFIED,
    moderator: process.env.GROUP_ID_MODERATOR,
    admin: process.env.GROUP_ID_ADMIN,
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

  if (!config.groups.free) {
    throw new Error('GROUP_ID_FREE not configured');
  }

  const result = await addUserToGroup(userId, config.groups.free);

  // Audit log
  await logAuditEvent({
    action: 'USER_SIGNUP',
    userId,
    groupId: config.groups.free,
    result
  });

  return { success: result.success, results: { addToFree: result } };
}

/**
 * Handle subscription upgrade to premium
 * @param {string} userId - User Object ID
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function onPremiumUpgrade(userId) {
  console.log(`Processing premium upgrade for user ${userId}`);

  if (!config.groups.free || !config.groups.premium) {
    throw new Error('GROUP_ID_FREE or GROUP_ID_PREMIUM not configured');
  }

  // Remove from free tier
  const removeResult = await removeUserFromGroup(userId, config.groups.free);

  // Add to premium tier
  const addResult = await addUserToGroup(userId, config.groups.premium);

  const results = {
    removeFromFree: removeResult,
    addToPremium: addResult
  };

  // Audit log
  await logAuditEvent({
    action: 'PREMIUM_UPGRADE',
    userId,
    results
  });

  return {
    success: removeResult.success && addResult.success,
    results
  };
}

/**
 * Handle subscription downgrade from premium
 * @param {string} userId - User Object ID
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function onPremiumDowngrade(userId) {
  console.log(`Processing premium downgrade for user ${userId}`);

  if (!config.groups.free || !config.groups.premium) {
    throw new Error('GROUP_ID_FREE or GROUP_ID_PREMIUM not configured');
  }

  // Remove from premium tier
  const removeResult = await removeUserFromGroup(userId, config.groups.premium);

  // Add back to free tier
  const addResult = await addUserToGroup(userId, config.groups.free);

  const results = {
    removeFromPremium: removeResult,
    addToFree: addResult
  };

  // Audit log
  await logAuditEvent({
    action: 'PREMIUM_DOWNGRADE',
    userId,
    results
  });

  return {
    success: removeResult.success && addResult.success,
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

  if (!config.groups.verified) {
    throw new Error('GROUP_ID_VERIFIED not configured');
  }

  const result = await addUserToGroup(userId, config.groups.verified);

  // Audit log
  await logAuditEvent({
    action: 'VERIFICATION_APPROVED',
    userId,
    groupId: config.groups.verified,
    result
  });

  return { success: result.success, results: { addToVerified: result } };
}

/**
 * Handle verification revocation
 * @param {string} userId - User Object ID
 * @returns {Promise<{success: boolean, results: object}>}
 */
async function onVerificationRevoked(userId) {
  console.log(`Processing verification revocation for user ${userId}`);

  if (!config.groups.verified) {
    throw new Error('GROUP_ID_VERIFIED not configured');
  }

  const result = await removeUserFromGroup(userId, config.groups.verified);

  // Audit log
  await logAuditEvent({
    action: 'VERIFICATION_REVOKED',
    userId,
    groupId: config.groups.verified,
    result
  });

  return { success: result.success, results: { removeFromVerified: result } };
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

  if (!config.groups.banned || !config.groups.free) {
    throw new Error('GROUP_ID_BANNED or GROUP_ID_FREE not configured');
  }

  // Remove from banned
  const removeResult = await removeUserFromGroup(userId, config.groups.banned);

  // Add to free tier (default after ban lift)
  const addResult = await addUserToGroup(userId, config.groups.free);

  const results = {
    removeFromBanned: removeResult,
    addToFree: addResult
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
 * @param {string} expectedTier - Expected subscription tier ('free' or 'premium')
 * @param {boolean} isVerified - Whether user is verified
 * @param {boolean} isBanned - Whether user is banned
 * @returns {Promise<{userId: string, status: string, changes: Array}>}
 */
async function reconcileUser(userId, expectedTier, isVerified, isBanned) {
  console.log(`Reconciling user ${userId}`);

  const currentGroups = await getUserGroups(userId);
  const currentGroupIds = currentGroups.map(g => g.id);
  const changes = [];

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

  // Ensure correct tier group
  const tierGroup = expectedTier === 'premium'
    ? config.groups.premium
    : config.groups.free;
  const otherTierGroup = expectedTier === 'premium'
    ? config.groups.free
    : config.groups.premium;

  if (tierGroup && !currentGroupIds.includes(tierGroup)) {
    changes.push(await addUserToGroup(userId, tierGroup));
  }
  if (otherTierGroup && currentGroupIds.includes(otherTierGroup)) {
    changes.push(await removeUserFromGroup(userId, otherTierGroup));
  }

  // Handle verification status
  if (config.groups.verified) {
    if (isVerified && !currentGroupIds.includes(config.groups.verified)) {
      changes.push(await addUserToGroup(userId, config.groups.verified));
    }
    if (!isVerified && currentGroupIds.includes(config.groups.verified)) {
      changes.push(await removeUserFromGroup(userId, config.groups.verified));
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

  // FLAMORAL operations
  onUserSignup,
  onPremiumUpgrade,
  onPremiumDowngrade,
  onVerificationApproved,
  onVerificationRevoked,
  onUserBanned,
  onBanLifted,

  // Reconciliation
  reconcileUser,
  reconcileAllUsers,

  // Audit
  logAuditEvent
};
