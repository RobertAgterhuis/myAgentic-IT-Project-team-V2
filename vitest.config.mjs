import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    include: [
      'tests/**/*.test.js',
    ],
    exclude: [
      '**/node_modules/**',
      'tests/unit/email-templates.test.js',
      'tests/unit/matomo-analytics.test.js',
      'tests/unit/middleware.test.js',
      'tests/unit/pilot-readiness.test.js',
      'tests/unit/social-cards.test.js',
      'tests/unit/translation-validation.test.js',
      'tests/unit/weblate-docker.test.js',
      'tests/unit/weblate-sync.test.js',
      'tests/unit/weblate-trial.test.js',
      'tests/integration/health.integration.test.js',
      'tests/integration/server.integration.test.js',
      'tests/integration/subscribe.integration.test.js',
      'tests/smoke/landing.smoke.test.js',
      'tests/unit/example.test.js',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/webapp/**/*.js'],
      exclude: [
        'src/webapp/node_modules/**',
        'src/webapp/ui/**',
        'src/webapp/start.ps1',
      ],
      reporter: ['text', 'text-summary', 'json-summary', 'json'],
      reportsDirectory: 'coverage',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
