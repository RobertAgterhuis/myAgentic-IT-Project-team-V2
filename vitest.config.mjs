import { defineConfig } from 'vitest/config';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Vite plugin that resolves .js/.mjs/.cjs imports to .ts when the
 * original file doesn't exist on disk.  This handles CJS require()
 * calls in test files that reference source modules renamed from
 * .js to .ts during the TypeScript conversion.
 */
function resolveJsToTs() {
  const jsExts = ['.js', '.mjs', '.cjs'];
  return {
    name: 'resolve-js-to-ts',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || /node_modules/.test(source)) return null;
      if (!source.startsWith('.') && !path.isAbsolute(source)) return null;

      const dir = path.dirname(importer);

      // Case 1: explicit .js extension → try .ts
      if (source.endsWith('.js')) {
        const resolved = path.resolve(dir, source);
        if (fs.existsSync(resolved)) return null;
        const tsPath = resolved.replace(/\.js$/, '.ts');
        if (fs.existsSync(tsPath)) return tsPath;
        return null;
      }

      // Case 2: no extension (bare require) → try .ts first, then .js
      const hasExt = jsExts.some((e) => source.endsWith(e)) || source.endsWith('.ts') || source.endsWith('.json');
      if (!hasExt) {
        const base = path.resolve(dir, source);
        const tsPath = base + '.ts';
        if (fs.existsSync(tsPath)) return tsPath;
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveJsToTs()],
  resolve: {
    extensions: ['.ts', '.js', '.mjs', '.cjs', '.json'],
  },
  test: {
    globals: true,
    fileParallelism: false,
    deps: {
      inline: [/./],
    },
    setupFiles: ['tests/setup-require-hook.js'],
    include: [
      'tests/**/*.test.js',
    ],
    exclude: [
      '**/node_modules/**',
      'tests/integration/git-adapter.integration.test.js',
      'tests/integration/testing-adapter.integration.test.js',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/webapp/**/*.{js,ts}', 'platform/engine/**/*.{js,ts}', 'platform/sdlc/**/*.{js,ts}'],
      exclude: [
        'src/webapp/node_modules/**',
        'src/webapp/ui/**',
        '**/index.ts',
        '**/types.ts',
        'platform/sdlc/adapters/contracts/**',
        'platform/engine/persistence/storage-provider.ts',
        'platform/engine/jobs/job-types.ts',
        'src/webapp/start.ps1',
        'platform/engine/flows.yaml',
        '**/*.d.ts',
      ],
      reporter: ['text', 'text-summary', 'json-summary', 'json'],
      reportsDirectory: 'coverage',
      thresholds: {
        statements: 73,
        branches: 60,
        functions: 74,
        lines: 74,
      },
    },
  },
});
