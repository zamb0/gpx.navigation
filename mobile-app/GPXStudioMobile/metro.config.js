const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for absolute imports
config.resolver.alias = {
    '@': __dirname,
    '@/src': path.resolve(__dirname, 'src'),
    '@/components': path.resolve(__dirname, 'components'),
    '@/screens': path.resolve(__dirname, 'src/screens'),
    '@/hooks': path.resolve(__dirname, 'hooks'),
    '@/context': path.resolve(__dirname, 'src/context'),
    '@/lib': path.resolve(__dirname, 'src/lib'),
    '@/services': path.resolve(__dirname, 'src/services'),
    '@/utils': path.resolve(__dirname, 'src/utils'),
    '@/styles': path.resolve(__dirname, 'src/styles'),
    '@/constants': path.resolve(__dirname, 'constants'),
};

module.exports = config;
