module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@redux': './src/redux',
          '@services': './src/services',
          '@utils': './src/utils',
          '@types': './src/types',
          '@navigation': './src/navigation',
        },
      },
    ],
  ],
};
