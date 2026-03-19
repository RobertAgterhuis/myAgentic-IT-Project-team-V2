// @ts-check
// S2-5: ESLint flat config — replaces legacy .eslintrc.js
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  /* ── Global ignores ─────────────────────────────────────────── */
  {
    ignores: [
      'node_modules/',
      'coverage/',
      'dist/',
      'build/',
      '.github/',
      'docs/',
      'BusinessDocs/',
      'word/',
      'locales/',
      'src/webapp/ui/',
      '*.config.js',
      '*.config.mjs',
    ],
  },

  /* ── Base: eslint recommended ───────────────────────────────── */
  js.configs.recommended,

  /* ── All JS/TS files: TypeScript parser + Prettier ──────────── */
  {
    files: ['**/*.js', '**/*.mjs', '**/*.ts', '**/*.jsx', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-var-requires': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  /* ── Test files: relax console, add vitest globals ──────────── */
  {
    files: ['**/*.test.js', '**/*.spec.js', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },

  /* ── Script files: relax console ────────────────────────────── */
  {
    files: ['scripts/**/*.{js,mjs}'],
    rules: {
      'no-console': 'off',
    },
  },



  /* ── TypeScript files: disable no-undef (TS handles this) ──── */
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-undef': 'off',
    },
  },

  /* ── Webapp source (non-test): security rules ───────────────── */
  {
    files: ['src/webapp/**/*.{js,ts}'],
    ignores: ['**/*.test.{js,ts}'],
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },

  /* ── M3 strict rollout exceptions ───────────────────────────── */
  {
    files: [
      'src/webapp/mcp-server.ts',
      'src/webapp/server.ts',
    ],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },

  /* ── Prettier must come last to disable conflicting rules ───── */
  prettierConfig,
];
