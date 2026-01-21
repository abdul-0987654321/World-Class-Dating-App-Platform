module.exports = function (api) {
  api.cache(true);

  const isProduction = process.env.NODE_ENV === 'production';

  // Ignore fabric source files that cause codegen issues with old architecture
  const ignore = [
    /node_modules\/react-native-screens\/src\/fabric\/.*/,
    /node_modules\/.*\/src\/fabric\/.*/,
    /.*\/fabric\/.*NativeComponent.*/,
  ];

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
    ignore,
    overrides: [
      {
        // Exclude all fabric-related files from codegen processing
        test: /node_modules\/.*\/src\/fabric\/.*/,
        plugins: [],
      },
    ],
  };
};
