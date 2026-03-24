// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import storybook from 'eslint-plugin-storybook';

export default tseslint.config(
  /* ── Global ignores ─────────────────────────────────────────── */
  { ignores: ['dist/', 'storybook-static/', 'node_modules/'] },

  /* ── Base recommended rules ─────────────────────────────────── */
  js.configs.recommended,
  ...tseslint.configs.recommended,

  /* ── React / TS source files ────────────────────────────────── */
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: ['badgeVariants', 'buttonVariants', 'showToast'],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  /* ── Test utilities + non-component files: relax react-refresh ─ */
  {
    files: [
      'src/test/**/*.{ts,tsx}',
      'src/lib/query-provider.tsx',
      'src/components/ui/toast-system.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  /* ── Test files: relax rules ────────────────────────────────── */
  {
    files: ['src/**/*.{test,spec}.{ts,tsx}'],
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
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  /* ── Storybook stories ──────────────────────────────────────── */
  ...storybook.configs['flat/recommended']
);
