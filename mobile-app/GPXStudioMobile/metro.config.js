const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add polyfills for Node.js modules
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: require.resolve('buffer'),
  stream: require.resolve('stream-browserify'),
  process: require.resolve('process/browser'),
};

module.exports = config;
