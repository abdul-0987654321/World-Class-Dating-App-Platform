/**
 * Expo config plugin to fix REACT_NATIVE_NODE_MODULES_DIR for native modules
 * This resolves build issues with react-native-screens, react-native-reanimated, etc.
 * in monorepo setups where react-native is hoisted to root node_modules.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

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
// Uses multiple fallback methods to find react-native
def findReactNativeDir() {
    // Method 1: Try node resolution (works in most cases)
    try {
        def result = ["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir)
        result.waitFor()
        if (result.exitValue() == 0) {
            def path = result.text.trim()
            if (path && new File(path).exists()) {
                return new File(path).getParentFile().getAbsoluteFile()
            }
        }
    } catch (Exception e) {
        println "[withReactNativeModulesDir] Node resolution failed: " + e.message
    }

    // Method 2: Check relative to project root (monorepo hoisted)
    def hoistedPath = new File(rootDir, "../../node_modules/react-native")
    if (hoistedPath.exists()) {
        return hoistedPath.getCanonicalFile()
    }

    // Method 3: Check local node_modules
    def localPath = new File(rootDir, "../node_modules/react-native")
    if (localPath.exists()) {
        return localPath.getCanonicalFile()
    }

    // Method 4: Use the reactNativeDir from react block if available (set by Expo)
    // Return null and let the native module handle fallback
    println "[withReactNativeModulesDir] Warning: Could not find react-native directory"
    return null
}

def resolvedReactNativeDir = findReactNativeDir()
if (resolvedReactNativeDir != null) {
    ext.REACT_NATIVE_NODE_MODULES_DIR = resolvedReactNativeDir.absolutePath
    println "[withReactNativeModulesDir] Set REACT_NATIVE_NODE_MODULES_DIR to: " + resolvedReactNativeDir.absolutePath
}`;

      if (contents.includes(insertPoint)) {
        config.modResults.contents = contents.replace(insertPoint, insertPoint + '\n' + insertion);
      }
    }
    return config;
  });

  return config;
}

module.exports = withReactNativeModulesDir;
