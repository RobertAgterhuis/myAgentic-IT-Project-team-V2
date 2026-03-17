/**
 * Storybook stories for SessionsPage — M21-006.
 * Covers: Loading, Empty, Populated, Error states.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import SessionsPage from './sessions-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Sessions',
  component: SessionsPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SessionsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/sessions', () =>
          HttpResponse.json({
            sessions: [
              {
                id: 'sess-001',
                status: 'active',
                flow: 'CREATE',
                project: 'my-saas-app',
                phase: 'PHASE-2',
                created_at: '2025-01-15T10:00:00Z',
                updated_at: '2025-01-15T12:30:00Z',
              },
              {
                id: 'sess-002',
                status: 'completed',
                flow: 'AUDIT',
                project: 'legacy-crm',
                phase: 'PHASE-4',
                created_at: '2025-01-10T08:00:00Z',
                updated_at: '2025-01-12T16:00:00Z',
              },
              {
                id: 'sess-003',
                status: 'failed',
                flow: 'FEATURE',
                project: 'payment-gateway',
                phase: 'PHASE-3',
                created_at: '2025-01-08T09:00:00Z',
                updated_at: '2025-01-09T14:00:00Z',
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
      handlers: [http.get('/api/sessions', () => HttpResponse.json({ sessions: [] }))],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/sessions', async () => {
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
        http.get('/api/sessions', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        ),
      ],
    },
  },
};

export const ManyItems: Story = {
  name: 'Edge: Long List',
  parameters: {
    msw: {
      handlers: [
        http.get('/api/sessions', () =>
          HttpResponse.json({
            sessions: Array.from({ length: 50 }, (_, i) => ({
              id: `sess-${String(i).padStart(3, '0')}`,
              status: ['active', 'completed', 'failed', 'paused'][i % 4],
              flow: ['CREATE', 'AUDIT', 'FEATURE', 'HOTFIX'][i % 4],
              project: `project-${i}`,
              phase: `PHASE-${(i % 5) + 1}`,
              created_at: new Date(Date.now() - i * 3600_000).toISOString(),
              updated_at: new Date(Date.now() - i * 1800_000).toISOString(),
            })),
          })
        ),
      ],
    },
  },
};
