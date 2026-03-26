/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const requestedProject = process.env.VITEST_ONLY_PROJECT;
const includeUnitProject = !requestedProject || requestedProject === 'unit';
const includeStorybookProject = !requestedProject || requestedProject === 'storybook';

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
    // Prevent duplicate React instances when deps are hoisted by npm workspaces,
    // which can cause Vite to re-optimize mid-run and produce "Failed to fetch
    // dynamically imported module" errors in Storybook browser tests.
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
  },
  optimizeDeps: {
    // Eagerly pre-bundle React so the browser Vite server never re-optimizes
    // these deps during a Storybook test run (race condition with workspace hoisting).
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-dom/client',
      'lucide-react',
      '@tanstack/react-query',
      'msw-storybook-addon',
      'msw',
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/browser-globals.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/vite-env.d.ts',
        'src/main.tsx',
      ],
    },
    projects: [
      ...(includeUnitProject
        ? [
            {
              extends: true,
              test: {
                name: 'unit',
                environment: 'jsdom',
                include: ['src/**/*.{test,spec}.{ts,tsx}'],
                exclude: ['src/**/*.stories.{ts,tsx}'],
                setupFiles: ['./src/test/setup.ts'],
                pool: 'forks',
                testTimeout: 10000,
                server: {
                  deps: {
                    inline: ['@mswjs/interceptors'],
                  },
                },
              },
            },
          ]
        : []),
      ...(includeStorybookProject
        ? [
            {
              extends: true,
              plugins: [
                // The plugin will run tests for the stories defined in your Storybook config
                // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
                ...(await storybookTest({
                  configDir: path.join(dirname, '.storybook'),
                })),
              ],
              test: {
                name: 'storybook',
                fileParallelism: false,
                maxWorkers: 1,
                minWorkers: 1,
                browser: {
                  enabled: true,
                  headless: true,
                  provider: playwright({}),
                  instances: [
                    {
                      browser: 'chromium',
                    },
                  ],
                },
                setupFiles: ['.storybook/vitest.setup.ts'],
              },
            },
          ]
        : []),
    ],
  },
}));
