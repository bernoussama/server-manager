module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  // parserOptions: {
  //   ecmaVersion: 2021,
  //   sourceType: 'module',
  // },
  env: {
    node: true,
    es6: true,
  },
  rules: {
    // Custom rules
  },
};

