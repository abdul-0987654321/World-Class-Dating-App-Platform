/**
 * Expo config plugin to fix react-native-iap store variant ambiguity
 *
 * react-native-iap has two product flavors: 'amazon' and 'play'
 * This plugin adds missingDimensionStrategy to specify which store to use
 */
const { withAppBuildGradle } = require('expo/config-plugins');

function withIAPStoreVariant(config, { store = 'play' } = {}) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const contents = config.modResults.contents;

      // Check if already added
      if (contents.includes("missingDimensionStrategy 'store'")) {
        return config;
      }

      // Find the defaultConfig block and add missingDimensionStrategy
      const defaultConfigRegex = /(defaultConfig\s*\{[^}]*)(versionName[^\n]*)/;
      const match = contents.match(defaultConfigRegex);

      if (match) {
        const replacement = `${match[1]}${match[2]}\n        // react-native-iap store variant (play or amazon)\n        missingDimensionStrategy 'store', '${store}'`;
        config.modResults.contents = contents.replace(defaultConfigRegex, replacement);
      } else {
        // Fallback: try to find defaultConfig and add after it
        const fallbackRegex = /(defaultConfig\s*\{)/;
        if (contents.match(fallbackRegex)) {
          config.modResults.contents = contents.replace(
            fallbackRegex,
            `$1\n        // react-native-iap store variant (play or amazon)\n        missingDimensionStrategy 'store', '${store}'`
          );
        }
      }
    }
    return config;
  });
}

module.exports = withIAPStoreVariant;
