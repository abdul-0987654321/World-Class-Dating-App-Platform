module.exports = function (api) {
  api.cache(true);

  const isProduction = process.env.NODE_ENV === 'production';

  const plugins = [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@components': './src/components',
          '@screens': './src/screens',
          '@navigation': './src/navigation',
          '@hooks': './src/hooks',
          '@services': './src/services',
          '@store': './src/store',
          '@assets': './src/assets',
          '@utils': './src/utils',
          // Redirect fabric module imports to our shims
          './fabric/NativeScreensModule': './shims/react-native-screens/fabric/NativeScreensModule',
          './fabric/ModalScreenNativeComponent':
            './shims/react-native-screens/fabric/ModalScreenNativeComponent',
          './fabric/ScreenNativeComponent':
            './shims/react-native-screens/fabric/ScreenNativeComponent',
          './fabric/ScreenContainerNativeComponent':
            './shims/react-native-screens/fabric/ScreenContainerNativeComponent',
          './fabric/ScreenStackNativeComponent':
            './shims/react-native-screens/fabric/ScreenStackNativeComponent',
          './fabric/ScreenStackHeaderConfigNativeComponent':
            './shims/react-native-screens/fabric/ScreenStackHeaderConfigNativeComponent',
          './fabric/ScreenStackHeaderSubviewNativeComponent':
            './shims/react-native-screens/fabric/ScreenStackHeaderSubviewNativeComponent',
          './fabric/SearchBarNativeComponent':
            './shims/react-native-screens/fabric/SearchBarNativeComponent',
          './fabric/ScreenNavigationContainerNativeComponent':
            './shims/react-native-screens/fabric/ScreenNavigationContainerNativeComponent',
        },
      },
    ],
    // Must be last
    'react-native-reanimated/plugin',
  ];

  // Remove console statements in production builds
  if (isProduction) {
    plugins.unshift([
      'transform-remove-console',
      {
        // Keep error and warn for production debugging
        exclude: ['error', 'warn'],
      },
    ]);
  }

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Disable automatic React Native codegen for fabric files
          unstable_transformProfile: 'default',
        },
      ],
    ],
    plugins,
  };
};
