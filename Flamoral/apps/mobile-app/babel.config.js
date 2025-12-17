module.exports = function (api) {
  api.cache(true);

  const plugins = [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        blacklist: null,
        whitelist: null,
        safe: false,
        allowUndefined: true,
      },
    ],
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
          '@types': './src/types',
          '@config': './src/config',
          '@constants': './src/constants',
        },
      },
    ],
    // Must be last
    'react-native-reanimated/plugin',
  ];

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins,
  };
};
