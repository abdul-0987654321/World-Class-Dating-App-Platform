/**
 * Expo config plugin to FORCE Kotlin 1.9.24 by overriding React Native's version catalog
 *
 * ROOT CAUSE: React Native 0.76.9 ships with libs.versions.toml that specifies kotlin = "1.9.25"
 * This version catalog is loaded in settings.gradle and overrides our build.gradle settings.
 *
 * SOLUTION: Multiple layers of enforcement:
 * 1. PATCH the actual libs.versions.toml file to change kotlin version
 * 2. Override version catalog in dependencyResolutionManagement
 * 3. Add resolutionStrategy for plugin resolution
 * 4. Force buildscript classpath dependencies
 * 5. Force transitive kotlin-stdlib dependencies
 */
const {
  withSettingsGradle,
  withProjectBuildGradle,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const KOTLIN_VERSION = '1.9.24';

function withKotlinVersion(config) {
  // Step 0: PATCH the actual libs.versions.toml file in node_modules
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;

      // Find and patch the React Native libs.versions.toml
      const possiblePaths = [
        path.join(projectRoot, 'node_modules', 'react-native', 'gradle', 'libs.versions.toml'),
        path.join(
          projectRoot,
          '..',
          '..',
          'node_modules',
          'react-native',
          'gradle',
          'libs.versions.toml'
        ),
      ];

      for (const tomlPath of possiblePaths) {
        if (fs.existsSync(tomlPath)) {
          console.log(`[withKotlinVersion] Patching ${tomlPath}...`);
          let content = fs.readFileSync(tomlPath, 'utf-8');

          // Replace kotlin = "1.9.25" with kotlin = "1.9.24"
          if (content.includes('kotlin = "1.9.25"')) {
            content = content.replace('kotlin = "1.9.25"', `kotlin = "${KOTLIN_VERSION}"`);
            fs.writeFileSync(tomlPath, content);
            console.log(
              `[withKotlinVersion] PATCHED libs.versions.toml: kotlin = "${KOTLIN_VERSION}"`
            );
          } else if (content.includes(`kotlin = "${KOTLIN_VERSION}"`)) {
            console.log('[withKotlinVersion] libs.versions.toml already patched');
          } else {
            console.log('[withKotlinVersion] Unexpected kotlin version in libs.versions.toml');
          }
          break;
        }
      }

      return config;
    },
  ]);

  // Step 1: Modify settings.gradle to override version catalog AND inject plugin resolutionStrategy
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

    // Inject into existing versionCatalogs block
    const libsVersionOverride = `
        // Force Kotlin version override
        libs {
            version("kotlin", "${KOTLIN_VERSION}")
        }`;

    // Check if we already added the override
    if (settingsGradle.includes('Force Kotlin version')) {
      console.log('[withKotlinVersion] Kotlin override already present in settings.gradle');
    } else {
      // Inject resolutionStrategy into pluginManagement block
      if (settingsGradle.includes('pluginManagement {')) {
        settingsGradle = settingsGradle.replace(
          /pluginManagement\s*\{/,
          `pluginManagement {${resolutionStrategyBlock}`
        );
        console.log(
          '[withKotlinVersion] Injected resolutionStrategy into existing pluginManagement block'
        );
      }

      // Inject libs version override into existing versionCatalogs block
      if (settingsGradle.includes('versionCatalogs {')) {
        settingsGradle = settingsGradle.replace(
          /versionCatalogs\s*\{/,
          `versionCatalogs {${libsVersionOverride}`
        );
        console.log(
          '[withKotlinVersion] Injected libs version into existing versionCatalogs block'
        );
      }
    }

    config.modResults.contents = settingsGradle;
    return config;
  });

  // Step 2: Also modify build.gradle to force kotlin version at multiple levels
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

    // Force buildscript classpath resolution AND subproject dependencies
    const resolutionStrategy = `
// Force Kotlin ${KOTLIN_VERSION} for ALL configurations including buildscript
buildscript {
    configurations.all {
        resolutionStrategy {
            force "org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}"
            force "org.jetbrains.kotlin:kotlin-stdlib:${KOTLIN_VERSION}"
            force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:${KOTLIN_VERSION}"
            force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:${KOTLIN_VERSION}"
            force "org.jetbrains.kotlin:kotlin-reflect:${KOTLIN_VERSION}"
        }
    }
}

subprojects {
    configurations.all {
        resolutionStrategy {
            force "org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}"
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
