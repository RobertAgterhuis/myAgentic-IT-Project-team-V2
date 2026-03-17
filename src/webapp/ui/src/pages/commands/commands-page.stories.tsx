/**
 * Storybook stories for CommandsPage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import CommandsPage from './commands-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Commands',
  component: CommandsPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CommandsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/orchestrator/status', () =>
          HttpResponse.json({ state: 'IDLE', mode: 'CREATE', session_id: null })
        ),
        http.get('/api/command', () => HttpResponse.json({ commands: [] })),
      ],
    },
  },
};

export const WithQueue: Story = {
  name: 'With Queued Commands',
  parameters: {
    msw: {
      handlers: [
        http.get('/api/orchestrator/status', () =>
          HttpResponse.json({ state: 'PROCESSING', mode: 'CREATE', session_id: 'sess-001' })
        ),
        http.get('/api/command', () =>
          HttpResponse.json({
            commands: [
              {
                id: 'cmd-001',
                command: 'CREATE',
                project: 'my-saas-app',
                status: 'PROCESSING',
                queued_at: '2025-01-15T10:00:00Z',
              },
              {
                id: 'cmd-002',
                command: 'FEATURE',
                project: 'payment-module',
                status: 'PENDING',
                queued_at: '2025-01-15T10:05:00Z',
              },
            ],
          })
        ),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/orchestrator/status', async () => {
          await delay('infinite');
          return new HttpResponse(null);
        }),
        http.get('/api/command', async () => {
          await delay('infinite');
          return new HttpResponse(null);
        }),
      ],
    },
  },
};
