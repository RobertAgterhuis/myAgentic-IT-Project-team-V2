import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@chromatic-com/storybook', '@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/react-vite',
  // Deduplicate preview annotation entries across different path formats (e.g.
  // Windows vs. POSIX separators, mixed case) to prevent the same preview file
  // from being registered twice when the Storybook server resolves addon preview
  // paths through both direct and symlinked locations in the npm workspace layout.
  previewAnnotations: (entries = []) => {
    const seen = new Set<string>();
    return entries.filter((entry) => {
      if (typeof entry !== 'string') {
        return true;
      }
      const normalized = entry.replace(/\\/g, '/').toLowerCase();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  },
  // Ensure the Storybook Vite preview server collapses all React resolution
  // paths to a single instance. npm workspace hoisting exposes React via both
  // the real path and the @agentic-sdlc/ui symlink, which makes Vite treat
  // them as two separate modules. When that happens react-dom sets its
  // dispatcher on one copy while preview.ts calls useState on the other,
  // producing "Cannot read properties of null (reading 'useState')".
  // resolve.dedupe collapses both paths; optimizeDeps.include pre-bundles
  // React eagerly so the server never re-optimizes mid-run.
  async viteFinal(config) {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
      },
      optimizeDeps: {
        ...config.optimizeDeps,
        include: [
          ...(config.optimizeDeps?.include ?? []),
          'react',
          'react-dom',
          'react/jsx-runtime',
          'react-dom/client',
        ],
      },
    };
  },
  staticDirs: ['./public'],
};
export default config;
