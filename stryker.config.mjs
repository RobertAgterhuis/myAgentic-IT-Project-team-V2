export default {
  mutate: [
    'platform/engine/dispatcher.ts',
    'platform/engine/engine.ts',
    'platform/engine/deliverable-quality.ts',
    'platform/engine/agent-runtime-adapter.ts',
    'platform/sdlc/governance.ts',
    'platform/sdlc/observability.ts',
  ],
  testRunner: 'vitest',
  coverageAnalysis: 'off',
  vitest: {
    configFile: 'vitest.config.mjs',
  },
  reporters: ['clear-text', 'progress', 'json'],
  jsonReporter: {
    fileName: 'reports/mutation/mutation-report.json',
  },
  timeoutMS: 60000,
  concurrency: 2,
};
