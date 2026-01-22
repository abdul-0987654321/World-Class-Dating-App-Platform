/**
 * Expo config plugin to FORCE Kotlin version for Compose Compiler compatibility
 *
 * CRITICAL: expo-build-properties kotlinVersion is being ignored by EAS Build.
 * This plugin directly modifies the root build.gradle to force Kotlin 1.9.24.
 *
 * Required versions:
 * - Kotlin: 1.9.24 (required by KSP 1.9.24-1.0.20 and Compose Compiler 1.5.14)
 */
const { withProjectBuildGradle } = require('expo/config-plugins');

const KOTLIN_VERSION = '1.9.24';

function withComposeCompilerVersion(config) {
  return withProjectBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    console.log('[withComposeCompilerVersion] Forcing Kotlin version to ' + KOTLIN_VERSION);

    // Replace the kotlinVersion line in ext block to force our version
    // The template has: kotlinVersion = findProperty('android.kotlinVersion') ?: '1.9.25'
    // We need to replace it with a hardcoded version

    // Pattern 1: Replace findProperty fallback pattern
    buildGradle = buildGradle.replace(
      /kotlinVersion\s*=\s*findProperty\s*\(\s*['"]android\.kotlinVersion['"]\s*\)\s*\?:\s*['"][^'"]+['"]/g,
      `kotlinVersion = '${KOTLIN_VERSION}'`
    );

    // Pattern 2: Replace any direct kotlinVersion assignment
    buildGradle = buildGradle.replace(
      /kotlinVersion\s*=\s*['"]1\.9\.\d+['"]/g,
      `kotlinVersion = '${KOTLIN_VERSION}'`
    );

    // Verify the replacement worked
    if (buildGradle.includes(`kotlinVersion = '${KOTLIN_VERSION}'`)) {
      console.log(
        '[withComposeCompilerVersion] SUCCESS: Kotlin version forced to ' + KOTLIN_VERSION
      );
    } else {
      console.error('[withComposeCompilerVersion] FAILED: Could not find kotlinVersion to replace');
      // Fallback: try to add it to ext block
      buildGradle = buildGradle.replace(
        /(ext\s*\{)/,
        `$1\n        kotlinVersion = '${KOTLIN_VERSION}'`
      );
    }

    config.modResults.contents = buildGradle;
    return config;
  });
}

module.exports = withComposeCompilerVersion;
