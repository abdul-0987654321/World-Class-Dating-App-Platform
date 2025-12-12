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
    presets: ['module:@react-native/babel-preset'],
    plugins,
  };
};
