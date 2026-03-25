/**
 * Storybook stories for LineagePage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import LineagePage from './lineage-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Lineage',
  component: LineagePage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LineagePage>;

export default meta;
type Story = StoryObj<typeof meta>;

const artifactsData = {
  artifacts: [
    {
      id: 'art-001',
      name: 'onboarding-output.md',
      type: 'document',
      phase: 'onboarding',
      sprint: null,
      size: 4200,
    },
    {
      id: 'art-002',
      name: 'final-report-master.md',
      type: 'document',
      phase: 'synthesis',
      sprint: null,
      size: 18000,
    },
    {
      id: 'art-003',
      name: 'component-inventory.md',
      type: 'document',
      phase: 'storybook',
      sprint: null,
      size: 3500,
    },
  ],
};

const lineageData = {
  root: 'art-001',
  nodes: [
    { id: 'art-001', label: 'onboarding-output.md', type: 'source' },
    { id: 'art-002', label: 'final-report-master.md', type: 'derived' },
  ],
  edges: [{ from: 'art-001', to: 'art-002', relation: 'feeds' }],
};

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/artifacts', () =>
          HttpResponse.json({
            ok: true,
            count: artifactsData.artifacts.length,
            artifacts: artifactsData.artifacts.map((artifact, idx) => ({
              id: artifact.id,
              artifact_type: artifact.type,
              stage: artifact.phase?.toUpperCase() || 'UNKNOWN',
              status: 'VALID',
              content_hash: `hash-${idx}`,
              created_at: '2025-01-15T10:00:00Z',
              updated_at: '2025-01-15T10:00:00Z',
            })),
          })
        ),
        http.get('/api/v1/artifacts/:id/lineage', () =>
          HttpResponse.json({ ok: true, lineage: lineageData })
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
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/artifacts', () =>
          HttpResponse.json({ error: 'Not Found' }, { status: 404 })
        ),
      ],
    },
  },
};
