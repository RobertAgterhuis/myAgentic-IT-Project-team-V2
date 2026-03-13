module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'dist/',
    'build/',
    '*.config.js',
    '.github/',
    'docs/',
    'BusinessDocs/',
    'word/',
    'locales/',
  ],
  overrides: [
    {
      files: ['**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
      },
      globals: {
        vi: 'readonly',
      },
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: [
        'src/webapp/dashboard.js',
        'src/webapp/frontend-utils.js',
        'src/webapp/frontend-utils.test.js',
      ],
      env: {
        browser: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['src/webapp/**/*.js'],
      excludedFiles: ['**/*.test.js'],
      rules: {
        'no-eval': 'error',
        'no-implied-eval': 'error',
      },
    },
  ],
};
