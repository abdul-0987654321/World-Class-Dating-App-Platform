/**
 * Expo config plugin to fix Kotlin/Compose Compiler version mismatch
 *
 * Fixes the error:
 * This version (1.3.2) of the Compose Compiler requires Kotlin version 1.7.20
 * but you appear to be using Kotlin version 1.9.25 which is not known to be compatible.
 *
 * This adds composeOptions to all subprojects that use Compose.
 */
const { withProjectBuildGradle } = require('expo/config-plugins');

function withComposeCompilerVersion(config, { composeCompilerVersion = '1.5.14' } = {}) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const contents = config.modResults.contents;

      // Check if already configured
      if (contents.includes('kotlinCompilerExtensionVersion')) {
        console.log('[withComposeCompilerVersion] Already configured, skipping');
        return config;
      }

      // Add subprojects configuration at the end of the file to set Compose Compiler version
      // This will apply to all modules that use Compose (like expo-modules-core)
      const composeConfig = `

// Fix Kotlin/Compose Compiler version mismatch
// Compose Compiler ${composeCompilerVersion} is compatible with Kotlin 1.9.x
subprojects {
    afterEvaluate { project ->
        def hasCompose = project.plugins.hasPlugin('org.jetbrains.kotlin.android') ||
                         project.plugins.hasPlugin('com.android.library') ||
                         project.plugins.hasPlugin('com.android.application')
        if (hasCompose && project.hasProperty('android')) {
            project.android {
                if (project.android.hasProperty('composeOptions')) {
                    project.android.composeOptions {
                        kotlinCompilerExtensionVersion = '${composeCompilerVersion}'
                    }
                }
            }
        }
    }
}
`;

      config.modResults.contents = contents + composeConfig;
      console.log(
        `[withComposeCompilerVersion] Added composeOptions with version ${composeCompilerVersion}`
      );
    }

    return config;
  });
}

module.exports = withComposeCompilerVersion;
