/**
 * Expo config plugin to fix REACT_NATIVE_NODE_MODULES_DIR for native modules
 * This resolves build issues with react-native-screens, react-native-reanimated, etc.
 * in monorepo setups where react-native is hoisted to root node_modules.
 */
const { withAppBuildGradle, withProjectBuildGradle } = require('expo/config-plugins');

/**
 * Adds REACT_NATIVE_NODE_MODULES_DIR ext property to app/build.gradle
 * This is required for native modules to locate react-native in monorepos
 */
function withReactNativeModulesDir(config) {
  // Modify app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const contents = config.modResults.contents;

      // Check if already added
      if (contents.includes('REACT_NATIVE_NODE_MODULES_DIR')) {
        return config;
      }

      // Add the REACT_NATIVE_NODE_MODULES_DIR ext property after the projectRoot definition
      const insertPoint =
        'def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()';
      const insertion = `
// Resolve react-native location for native modules (e.g., react-native-screens, reanimated)
// This handles monorepo hoisting where react-native is in root node_modules
def reactNativeDir = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()
ext.REACT_NATIVE_NODE_MODULES_DIR = reactNativeDir.absolutePath`;

      if (contents.includes(insertPoint)) {
        config.modResults.contents = contents.replace(insertPoint, insertPoint + '\n' + insertion);
      }
    }
    return config;
  });

  // Modify root build.gradle to add subprojects SDK version defaults
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const contents = config.modResults.contents;

      // Check if already added
      if (contents.includes('// Apply SDK version defaults to all subprojects')) {
        return config;
      }

      // Add subprojects block after the rootproject plugin apply
      const insertPoint = 'apply plugin: "com.facebook.react.rootproject"';
      const insertion = `

// Apply SDK version defaults to all subprojects (ensures native modules have required values)
subprojects {
    afterEvaluate { project ->
        if (project.hasProperty('android')) {
            def android = project.android
            // Ensure compileSdkVersion is set for all modules
            if (!android.hasProperty('compileSdkVersion') || android.compileSdkVersion == null) {
                android.compileSdkVersion rootProject.ext.compileSdkVersion
            }
            // Ensure all default configs have proper SDK versions
            if (android.defaultConfig != null) {
                if (android.defaultConfig.minSdkVersion == null) {
                    android.defaultConfig.minSdkVersion rootProject.ext.minSdkVersion
                }
                if (android.defaultConfig.targetSdkVersion == null) {
                    android.defaultConfig.targetSdkVersion rootProject.ext.targetSdkVersion
                }
            }
        }
    }
}`;

      if (contents.includes(insertPoint)) {
        config.modResults.contents = contents.replace(insertPoint, insertPoint + insertion);
      }
    }
    return config;
  });

  return config;
}

module.exports = withReactNativeModulesDir;
