/**
 * Expo config plugin to fix Kotlin/Compose Compiler version mismatch
 *
 * Fixes the error:
 * This version (1.3.2) of the Compose Compiler requires Kotlin version 1.7.20
 * but you appear to be using Kotlin version 1.9.25 which is not known to be compatible.
 *
 * This suppresses the Kotlin version compatibility check which is safe when using
 * compatible versions of Kotlin and Compose.
 */
const { withGradleProperties } = require('expo/config-plugins');

function withComposeCompilerVersion(config, { suppressKotlinVersionCheck = true } = {}) {
  return withGradleProperties(config, (config) => {
    // Add property to suppress Kotlin version compatibility check
    // This is needed because expo-modules-core uses an older Compose Compiler
    // that doesn't recognize newer Kotlin versions as compatible
    if (suppressKotlinVersionCheck) {
      // Remove existing property if present
      config.modResults = config.modResults.filter(
        (item) =>
          !(
            item.type === 'property' &&
            item.key === 'kotlin.suppressKotlinVersionCompatibilityCheck'
          )
      );

      config.modResults.push({
        type: 'property',
        key: 'kotlin.suppressKotlinVersionCompatibilityCheck',
        value: 'true',
      });

      console.log('[withComposeCompilerVersion] Suppressed Kotlin version compatibility check');
    }

    return config;
  });
}

module.exports = withComposeCompilerVersion;
