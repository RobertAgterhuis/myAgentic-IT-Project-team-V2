import { createElement, useState } from 'react';
import type { Preview } from '@storybook/react-vite';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { http, HttpResponse } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/components/ui/theme-provider';
import { createStoryQueryClient } from '../src/test/storybook-decorators';
import '../src/index.css';

initialize();

function StoryQueryProvider({ children }: { children: ReturnType<typeof createElement> }) {
  const [queryClient] = useState(() => createStoryQueryClient());
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

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
    msw: {
      handlers: [
        http.get(
          'https://fonts.googleapis.com/*',
          () =>
            new HttpResponse('body { --storybook-fonts-mocked: 1; }', {
              status: 200,
              headers: { 'content-type': 'text/css' },
            })
        ),
      ],
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
  decorators: [
    (Story) =>
      createElement(
        StoryQueryProvider,
        null,
        createElement(ThemeProvider, null, createElement(Story))
      ),
  ],
  loaders: [mswLoader],
};

export default preview;
