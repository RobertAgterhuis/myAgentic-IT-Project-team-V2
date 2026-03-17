/**
 * Storybook stories for ArtifactBrowserPage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import ArtifactBrowserPage from './artifact-browser-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Artifacts',
  component: ArtifactBrowserPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ArtifactBrowserPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/artifacts', () =>
          HttpResponse.json({
            artifacts: [
              {
                id: 'art-001',
                artifact_type: 'document',
                path: 'BusinessDocs/synthesis/final-report-master.md',
                phase: 'synthesis',
                created_at: '2025-01-15T10:00:00Z',
              },
              {
                id: 'art-002',
                artifact_type: 'code',
                path: 'src/webapp/ui/src/App.tsx',
                phase: 'implementation',
                created_at: '2025-01-14T09:00:00Z',
              },
              {
                id: 'art-003',
                artifact_type: 'test',
                path: 'tests/unit/app.test.ts',
                phase: 'implementation',
                created_at: '2025-01-13T08:00:00Z',
              },
            ],
          })
        ),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [http.get('/api/artifacts', () => HttpResponse.json({ artifacts: [] }))],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/artifacts', async () => {
          await delay('infinite');
          return new HttpResponse(null);
        }),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/artifacts', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        ),
      ],
    },
  },
};
