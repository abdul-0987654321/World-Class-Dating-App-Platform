/**
 * Expo config plugin to ensure Associated Domains entitlement is properly configured
 *
 * This plugin does the following:
 * 1. Adds the associated domains entitlement to the iOS entitlements file
 * 2. Works with both EAS Build (remote credentials) and local credentials
 *
 * For EAS Build with remote credentials:
 * - EAS automatically syncs the Associated Domains capability with Apple Developer Portal
 * - The provisioning profile is regenerated with the capability included
 *
 * For local credentials:
 * - The provisioning profile must already have the Associated Domains capability
 * - Enable it in Apple Developer Portal: Certificates, Identifiers & Profiles > Identifiers > [Your App] > Associated Domains
 *
 * Usage in app.config.js:
 * plugins: [
 *   ['./plugins/withAssociatedDomains', {
 *     domains: ['applinks:flamoral.com', 'applinks:*.flamoral.com']
 *   }]
 * ]
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Adds Associated Domains entitlement to iOS build
 * @param {object} config - Expo config object
 * @param {object} props - Plugin props
 * @param {string[]} props.domains - Array of associated domains (e.g., ['applinks:example.com'])
 */
function withAssociatedDomains(config, props = {}) {
  const { domains = [] } = props;

  if (!domains || domains.length === 0) {
    console.warn('[withAssociatedDomains] No domains provided, skipping entitlement configuration');
    return config;
  }

  // Validate domain format
  for (const domain of domains) {
    if (
      !domain.startsWith('applinks:') &&
      !domain.startsWith('webcredentials:') &&
      !domain.startsWith('activitycontinuation:')
    ) {
      console.warn(
        `[withAssociatedDomains] Domain "${domain}" should start with applinks:, webcredentials:, or activitycontinuation:`
      );
    }
  }

  return withEntitlementsPlist(config, (config) => {
    // Add the associated domains entitlement
    // This key is: com.apple.developer.associated-domains
    config.modResults['com.apple.developer.associated-domains'] = domains;

    console.log(
      `[withAssociatedDomains] Added ${domains.length} associated domains to entitlements:`
    );
    domains.forEach((d) => console.log(`  - ${d}`));

    return config;
  });
}

module.exports = withAssociatedDomains;
