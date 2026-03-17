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
            all: [
              {
                id: 'DEC-001',
                title: 'Cloud Provider Selection',
                status: 'open',
                priority: 'HIGH',
                category: 'tech',
                rationale: '',
                created_at: '2025-01-15T10:00:00Z',
              },
              {
                id: 'DEC-002',
                title: 'Authentication Strategy',
                status: 'decided',
                priority: 'HIGH',
                category: 'tech',
                rationale: 'OAuth2 with PKCE',
                created_at: '2025-01-14T09:00:00Z',
              },
              {
                id: 'DEC-003',
                title: 'Color Palette',
                status: 'open',
                priority: 'MEDIUM',
                category: 'ux',
                rationale: '',
                created_at: '2025-01-13T08:00:00Z',
              },
            ],
            open: [
              {
                id: 'DEC-001',
                title: 'Cloud Provider Selection',
                status: 'open',
                priority: 'HIGH',
                category: 'tech',
              },
              {
                id: 'DEC-003',
                title: 'Color Palette',
                status: 'open',
                priority: 'MEDIUM',
                category: 'ux',
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
      handlers: [http.get('/api/decisions', () => HttpResponse.json({ all: [], open: [] }))],
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
