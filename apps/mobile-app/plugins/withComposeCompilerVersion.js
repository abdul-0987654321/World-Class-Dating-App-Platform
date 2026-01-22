/**
 * Expo config plugin for Kotlin/Compose Compiler compatibility
 *
 * IMPORTANT: This plugin is now a validation check only.
 *
 * Compose Compiler 1.5.14 (used by expo-modules-core) requires Kotlin 1.9.24.
 * KSP 1.9.24 also requires Kotlin 1.9.24.
 *
 * As long as kotlinVersion in expo-build-properties is set to '1.9.24',
 * no modifications are needed.
 *
 * This plugin logs a warning if an incompatible Kotlin version is detected.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

// Expected versions for compatibility
const EXPECTED_KOTLIN_VERSION = '1.9.24';
const COMPOSE_COMPILER_VERSION = '1.5.14';

function withComposeCompilerVersion(config) {
  return withAppBuildGradle(config, (config) => {
    // Log the configuration for debugging
    console.log('[withComposeCompilerVersion] Validating Kotlin/Compose compatibility...');
    console.log(`[withComposeCompilerVersion] Expected Kotlin: ${EXPECTED_KOTLIN_VERSION}`);
    console.log(`[withComposeCompilerVersion] Compose Compiler: ${COMPOSE_COMPILER_VERSION}`);

    // Check if build.gradle contains incompatible Kotlin version references
    const buildGradle = config.modResults.contents;

    // Look for any hardcoded kotlin version that might conflict
    const kotlinVersionMatch = buildGradle.match(/kotlinVersion\s*=\s*['"]([^'"]+)['"]/);
    if (kotlinVersionMatch) {
      const foundVersion = kotlinVersionMatch[1];
      if (foundVersion !== EXPECTED_KOTLIN_VERSION) {
        console.warn(
          `[withComposeCompilerVersion] WARNING: Found kotlinVersion=${foundVersion}, expected ${EXPECTED_KOTLIN_VERSION}`
        );
        console.warn(
          '[withComposeCompilerVersion] This may cause build failures due to Compose Compiler incompatibility'
        );
      } else {
        console.log(
          `[withComposeCompilerVersion] OK: Kotlin version ${foundVersion} is compatible`
        );
      }
    }

    // No modifications needed - just validation
    return config;
  });
}

module.exports = withComposeCompilerVersion;
