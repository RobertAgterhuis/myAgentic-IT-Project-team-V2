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
        http.get('/api/v1/artifacts', () =>
          HttpResponse.json({
            ok: true,
            count: 3,
            artifacts: [
              {
                id: 'art-001',
                artifact_type: 'document',
                stage: 'SYNTHESIS',
                status: 'VALID',
                content_hash: 'abc123def456',
                created_at: '2025-01-15T10:00:00Z',
                updated_at: '2025-01-15T10:00:00Z',
              },
              {
                id: 'art-002',
                artifact_type: 'code',
                stage: 'PHASE-2',
                status: 'DRAFT',
                content_hash: 'def456ghi789',
                created_at: '2025-01-14T09:00:00Z',
                updated_at: '2025-01-14T09:00:00Z',
              },
              {
                id: 'art-003',
                artifact_type: 'test',
                stage: 'PHASE-3',
                status: 'VALID',
                content_hash: 'ghi789jkl012',
                created_at: '2025-01-13T08:00:00Z',
                updated_at: '2025-01-13T08:00:00Z',
              },
            ],
          })
        ),
        http.get('/api/v1/approvals', () =>
          HttpResponse.json({ error: 'Approvals unavailable in story fixture' }, { status: 500 })
        ),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/artifacts', () =>
          HttpResponse.json({ ok: true, count: 0, artifacts: [] })
        ),
        http.get('/api/v1/approvals', () =>
          HttpResponse.json({ error: 'Approvals unavailable in story fixture' }, { status: 500 })
        ),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/artifacts', async () => {
          await delay('infinite');
          return new HttpResponse(null);
        }),
        http.get('/api/v1/approvals', () =>
          HttpResponse.json({ error: 'Approvals unavailable in story fixture' }, { status: 500 })
        ),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/artifacts', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        ),
        http.get('/api/v1/approvals', () =>
          HttpResponse.json({ error: 'Approvals unavailable in story fixture' }, { status: 500 })
        ),
      ],
    },
  },
};
