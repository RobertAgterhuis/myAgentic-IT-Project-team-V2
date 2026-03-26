import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@chromatic-com/storybook', '@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/react-vite',
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
  staticDirs: ['./public'],
};
export default config;
