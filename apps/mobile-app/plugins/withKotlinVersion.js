/**
 * Expo config plugin to FORCE Kotlin 1.9.24 by overriding React Native's version catalog
 *
 * ROOT CAUSE: React Native 0.76.9 ships with libs.versions.toml that specifies kotlin = "1.9.25"
 * This version catalog is loaded in settings.gradle and overrides our build.gradle settings.
 *
 * SOLUTION: Add a resolutionStrategy to force Kotlin 1.9.24 for all configurations.
 */
const { withSettingsGradle, withProjectBuildGradle } = require('expo/config-plugins');

const KOTLIN_VERSION = '1.9.24';

function withKotlinVersion(config) {
  // Step 1: Modify settings.gradle to inject resolutionStrategy into existing pluginManagement block
  config = withSettingsGradle(config, (config) => {
    let settingsGradle = config.modResults.contents;

    console.log('[withKotlinVersion] Overriding Kotlin version in settings.gradle...');

    // The resolutionStrategy to inject - must go INSIDE existing pluginManagement block
    const resolutionStrategyBlock = `
    // Force Kotlin version to ${KOTLIN_VERSION} (required for KSP 1.9.24 and Compose Compiler 1.5.14)
    resolutionStrategy {
        eachPlugin {
            if (requested.id.id.startsWith("org.jetbrains.kotlin")) {
                useVersion("${KOTLIN_VERSION}")
            }
        }
    }`;

    // Check if we already added the override
    if (settingsGradle.includes('Force Kotlin version')) {
      console.log('[withKotlinVersion] Kotlin override already present in settings.gradle');
    } else if (settingsGradle.includes('pluginManagement {')) {
      // Inject resolutionStrategy right after the first pluginManagement { opening
      settingsGradle = settingsGradle.replace(
        /pluginManagement\s*\{/,
        `pluginManagement {${resolutionStrategyBlock}`
      );
      console.log(
        '[withKotlinVersion] Injected resolutionStrategy into existing pluginManagement block'
      );
    } else {
      // No existing pluginManagement block - add one at the beginning
      const newBlock = `pluginManagement {${resolutionStrategyBlock}
}
`;
      settingsGradle = newBlock + settingsGradle;
      console.log('[withKotlinVersion] Added new pluginManagement block with resolutionStrategy');
    }

    config.modResults.contents = settingsGradle;
    return config;
  });

  // Step 2: Also modify build.gradle to force kotlin version and add resolution strategy
  config = withProjectBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    console.log('[withKotlinVersion] Forcing Kotlin version in build.gradle...');

    // Replace kotlinVersion in ext block
    buildGradle = buildGradle.replace(
      /kotlinVersion\s*=\s*findProperty\s*\(\s*['"]android\.kotlinVersion['"]\s*\)\s*\?:\s*['"][^'"]+['"]/g,
      `kotlinVersion = '${KOTLIN_VERSION}'`
    );
    buildGradle = buildGradle.replace(
      /kotlinVersion\s*=\s*['"]1\.9\.\d+['"]/g,
      `kotlinVersion = '${KOTLIN_VERSION}'`
    );

    // Add a resolution strategy to force Kotlin version for all dependencies
    const resolutionStrategy = `
// Force Kotlin ${KOTLIN_VERSION} for all configurations
subprojects {
    configurations.all {
        resolutionStrategy {
            force "org.jetbrains.kotlin:kotlin-stdlib:${KOTLIN_VERSION}"
            force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:${KOTLIN_VERSION}"
            force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:${KOTLIN_VERSION}"
            force "org.jetbrains.kotlin:kotlin-reflect:${KOTLIN_VERSION}"
        }
    }
}
`;

    // Add resolution strategy if not present
    if (!buildGradle.includes('Force Kotlin')) {
      buildGradle = buildGradle + '\n' + resolutionStrategy;
      console.log('[withKotlinVersion] Added resolution strategy to build.gradle');
    }

    config.modResults.contents = buildGradle;
    return config;
  });

  return config;
}

module.exports = withKotlinVersion;
