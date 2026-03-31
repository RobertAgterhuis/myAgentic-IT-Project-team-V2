import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    include: [
      'tests/unit/dispatcher.test.js',
      'tests/integration/dispatcher-reflection-loop.test.js',
    ],
    coverage: {
      provider: 'istanbul',
      include: ['platform/engine/dispatcher.ts', 'platform/engine/self-revision.ts'],
      exclude: [
        '**/node_modules/**',
        '**/index.ts',
        '**/types.ts',
        '**/*.d.ts',
        'platform/engine/flows.yaml',
        'platform/engine/persistence/storage-provider.ts',
        'platform/engine/jobs/job-types.ts',
      ],
      reporter: ['text', 'text-summary', 'json-summary', 'json'],
      reportsDirectory: 'coverage/reflection-istanbul',
    },
  },
});