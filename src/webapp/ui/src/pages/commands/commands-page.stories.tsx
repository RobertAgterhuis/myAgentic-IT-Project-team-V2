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
        http.get('/api/command', () => HttpResponse.json({ command: null, queue: [] })),
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
            command: {
              command: 'CREATE',
              project: 'my-saas-app',
              description: 'Kick off a full CREATE cycle for a new SaaS platform.',
              scope: null,
              requested_at: '2025-01-15T10:00:00Z',
              status: 'PROCESSING',
              source: 'ui',
              clipboard_text: '',
            },
            queue: [
              {
                command: 'CREATE',
                project: 'my-saas-app',
                description: 'Kick off a full CREATE cycle for a new SaaS platform.',
                scope: null,
                status: 'PROCESSING',
                requested_at: '2025-01-15T10:00:00Z',
                source: 'ui',
                clipboard_text: '',
              },
              {
                command: 'FEATURE',
                project: 'payment-module',
                description: 'Add a new payment module to the current product.',
                scope: null,
                status: 'PENDING',
                requested_at: '2025-01-15T10:05:00Z',
                source: 'ui',
                clipboard_text: '',
              },
            ],
          })
        ),
      ],
    },
  },
};

export const Populated: Story = {
  ...WithQueue,
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

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/orchestrator/status', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        ),
        http.get('/api/command', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        ),
      ],
    },
  },
};
