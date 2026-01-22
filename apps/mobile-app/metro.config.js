const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const shimsRoot = path.resolve(projectRoot, 'shims');

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo (preserve Expo defaults)
config.watchFolders = [...(config.watchFolders || []), monorepoRoot];

// Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure sourceExts includes all needed extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

// Use extraNodeModules to completely redirect fabric imports
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
};

// Custom resolver to redirect ALL fabric module imports to our shims
// This is needed because react-native-screens 4.x includes Fabric components
// that cause codegen errors when New Architecture is disabled
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle any import that contains 'fabric' from react-native-screens
  // This catches both direct imports and relative imports (e.g., ../../fabric/...)
  if (moduleName.includes('fabric')) {
    // Extract the full path after 'fabric/' (handles nested directories like bottom-tabs/)
    const match = moduleName.match(/fabric[/\\](.+)/);
    if (match) {
      // Get the relative path after 'fabric/' and remove extension
      const fabricRelativePath = match[1].replace(/\.(ts|tsx|js|jsx)$/, '');
      const shimPath = path.resolve(
        shimsRoot,
        'react-native-screens',
        'fabric',
        fabricRelativePath + '.ts'
      );
      try {
        require.resolve(shimPath);
        return {
          filePath: shimPath,
          type: 'sourceFile',
        };
      } catch {
        // Shim doesn't exist, try with .tsx extension
        const shimPathTsx = shimPath.replace(/\.ts$/, '.tsx');
        try {
          require.resolve(shimPathTsx);
          return {
            filePath: shimPathTsx,
            type: 'sourceFile',
          };
        } catch {
          // No shim found, continue with default resolution
        }
      }
    }
  }

  // Fall back to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
