import type { Preview } from '@storybook/react-vite';
import { initialize, mswLoader } from 'msw-storybook-addon';
import '../src/index.css';

initialize();

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: ['Foundations', 'Layout', 'Components', 'Pages'],
      },
    },
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      source: { type: 'dynamic' },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'error',
      config: {
        rules: [
          // P1-UI-E2-I1: color-contrast re-enabled with relaxed ratio.
          // WCAG AA requires 4.5:1 for normal text; we use 3.0:1 for large text / UI components
          // on intentional low-contrast dark-mode brand surfaces (info, warning badges on dark bg).
          // Document each deliberate exception here rather than disabling globally.
          {
            id: 'color-contrast',
            enabled: true,
            options: {
              // Allow 3:1 for large text (18pt / 14pt bold) and interactive components.
              // Standard AA for small text (3+ characters) remains at 4.5:1 via axe default.
              contrastRatio: {
                normal: { expected: 4.5 },
                large: { expected: 3.0 },
              },
            },
          },
        ],
      },
    },
  },
  loaders: [mswLoader],
};

export default preview;
