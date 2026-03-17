/**
 * Storybook stories for GovernanceDashboardPage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import GovernanceDashboardPage from './governance-dashboard-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Governance',
  component: GovernanceDashboardPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof GovernanceDashboardPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/approvals', () =>
          HttpResponse.json([
            {
              id: 'apr-001',
              title: 'Phase 1 Gate Approval',
              status: 'pending',
              requested_at: '2025-01-15T10:00:00Z',
              requested_by: 'orchestrator',
            },
            {
              id: 'apr-002',
              title: 'Phase 2 Gate Approval',
              status: 'approved',
              requested_at: '2025-01-14T09:00:00Z',
              requested_by: 'orchestrator',
              decided_at: '2025-01-14T11:00:00Z',
            },
          ])
        ),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [http.get('/api/approvals', () => HttpResponse.json([]))],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/approvals', async () => {
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
        http.get('/api/approvals', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        ),
      ],
    },
  },
};
