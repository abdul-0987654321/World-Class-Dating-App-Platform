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

// Custom resolver to redirect fabric module imports to our shims
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect react-native-screens fabric imports to our shims
  if (moduleName.includes('react-native-screens') && moduleName.includes('/fabric/')) {
    const fabricModule = moduleName.split('/fabric/')[1];
    if (fabricModule) {
      const shimPath = path.resolve(shimsRoot, 'react-native-screens', 'fabric', fabricModule);
      return {
        filePath: shimPath + '.ts',
        type: 'sourceFile',
      };
    }
  }

  // Handle relative imports from within react-native-screens to fabric modules
  if (
    context.originModulePath &&
    context.originModulePath.includes('react-native-screens') &&
    moduleName.startsWith('./fabric/')
  ) {
    const fabricModule = moduleName.replace('./fabric/', '');
    const shimPath = path.resolve(shimsRoot, 'react-native-screens', 'fabric', fabricModule);
    return {
      filePath: shimPath + '.ts',
      type: 'sourceFile',
    };
  }

  // Fall back to default resolver
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
