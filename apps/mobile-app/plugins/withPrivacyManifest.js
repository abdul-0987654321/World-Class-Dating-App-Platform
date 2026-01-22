/**
 * Expo config plugin to add Privacy Manifest (PrivacyInfo.xcprivacy) to iOS build
 *
 * Apple requires Privacy Manifests for apps that use certain APIs starting
 * with iOS 17. This plugin copies the PrivacyInfo.xcprivacy file to the iOS project.
 *
 * SIMPLIFIED VERSION: Just copies the file to iOS bundle, letting Expo handle Xcode integration.
 */
const { withDangerousMod } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

function withPrivacyManifest(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;

      // Get the app name for the iOS directory
      const appName = config.name?.replace(/[^a-zA-Z0-9]/g, '') || 'flamoral';

      // Source path (in project root)
      const sourcePath = path.join(projectRoot, 'PrivacyInfo.xcprivacy');

      // Check if source file exists
      if (!fs.existsSync(sourcePath)) {
        console.warn(
          '[withPrivacyManifest] PrivacyInfo.xcprivacy not found in project root, skipping'
        );
        return config;
      }

      // Destination paths - copy to multiple locations to ensure it's included
      const iosDir = path.join(projectRoot, 'ios');
      const destinations = [
        path.join(iosDir, appName, 'PrivacyInfo.xcprivacy'),
        path.join(iosDir, 'PrivacyInfo.xcprivacy'),
      ];

      for (const destPath of destinations) {
        try {
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          fs.copyFileSync(sourcePath, destPath);
          console.log(`[withPrivacyManifest] Copied to ${destPath}`);
        } catch (error) {
          console.warn(`[withPrivacyManifest] Could not copy to ${destPath}: ${error.message}`);
        }
      }

      return config;
    },
  ]);
}

module.exports = withPrivacyManifest;
