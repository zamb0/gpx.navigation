const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const path = require('path');

const compat = new FlatCompat({
  baseDirectory: path.resolve(),
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  ...compat.extends('expo'),
  {
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'warn',
    },
  },
];
