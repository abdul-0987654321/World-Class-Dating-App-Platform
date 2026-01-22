/**
 * Expo config plugin to fix Kotlin/Compose Compiler version mismatch
 *
 * Fixes the error:
 * This version (1.3.2) of the Compose Compiler requires Kotlin version 1.7.20
 * but you appear to be using Kotlin version 1.9.25 which is not known to be compatible.
 *
 * This adds the suppressKotlinVersionCompatibilityCheck compiler argument.
 */
const { withProjectBuildGradle, withAppBuildGradle } = require('expo/config-plugins');

function withComposeCompilerVersion(config) {
  // Add suppression to project build.gradle for all modules
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const contents = config.modResults.contents;

      // Check if already configured
      if (contents.includes('suppressKotlinVersionCompatibilityCheck')) {
        console.log('[withComposeCompilerVersion] Already configured, skipping');
        return config;
      }

      // Add allprojects configuration to suppress the version check for all modules
      const suppressionConfig = `

// Fix Kotlin/Compose Compiler version mismatch
// Suppress version check for all modules that use Kotlin
allprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            freeCompilerArgs += ["-P", "plugin:androidx.compose.compiler.plugins.kotlin:suppressKotlinVersionCompatibilityCheck=1.9.25"]
        }
    }
}
`;

      config.modResults.contents = contents + suppressionConfig;
      console.log(
        '[withComposeCompilerVersion] Added suppressKotlinVersionCompatibilityCheck compiler argument'
      );
    }

    return config;
  });

  return config;
}

module.exports = withComposeCompilerVersion;
