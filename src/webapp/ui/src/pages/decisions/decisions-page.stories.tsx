/**
 * Storybook stories for DecisionsPage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import DecisionsPage from './decisions-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Decisions',
  component: DecisionsPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DecisionsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/decisions', () =>
          HttpResponse.json({
            open: [
              {
                id: 'DEC-001',
                type: 'OPEN_QUESTION',
                status: 'OPEN',
                priority: 'HIGH',
                scope: 'Tech Architecture',
                question: 'Which cloud provider should host the platform?',
                answer: '',
                date: '2025-01-15',
              },
              {
                id: 'DEC-003',
                type: 'OPEN_QUESTION',
                status: 'OPEN',
                priority: 'MEDIUM',
                scope: 'UX',
                question: 'What color palette direction should the redesign follow?',
                answer: '',
                date: '2025-01-13',
              },
            ],
            decided: [
              {
                id: 'DEC-002',
                type: 'DECIDED',
                status: 'DECIDED',
                priority: 'HIGH',
                scope: 'Identity',
                decision: 'Use OAuth2 with PKCE for operator authentication.',
                notes: 'Matches enterprise SSO requirements and current platform direction.',
                category: 'Security',
                date: '2025-01-14',
              },
            ],
            deferred: [
              {
                id: 'DEC-004',
                status: 'DEFERRED',
                scope: 'Operations',
                subject: 'Regional failover topology',
                reason: 'Need current usage and latency data before deciding.',
                date: '2025-01-12',
              },
            ],
            categories: [],
          })
        ),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/decisions', () =>
          HttpResponse.json({ open: [], decided: [], deferred: [], categories: [] })
        ),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/decisions', async () => {
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
        http.get('/api/decisions', () =>
          HttpResponse.json({ error: 'Permission denied' }, { status: 403 })
        ),
      ],
    },
  },
};
