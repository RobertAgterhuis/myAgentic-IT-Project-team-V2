/**
 * Storybook stories for PipelinePage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import PipelinePage from './pipeline-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Pipeline',
  component: PipelinePage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PipelinePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/pipeline', () =>
          HttpResponse.json({
            stages: [
              {
                id: 'stage-1',
                name: 'Analysis',
                status: 'completed',
                agents: ['Business Analyst', 'Domain Expert'],
              },
              {
                id: 'stage-2',
                name: 'Architecture',
                status: 'running',
                agents: ['Software Architect'],
              },
              { id: 'stage-3', name: 'Implementation', status: 'pending', agents: [] },
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
      handlers: [http.get('/api/pipeline', () => HttpResponse.json({ stages: [] }))],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/pipeline', async () => {
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
        http.get('/api/pipeline', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        ),
      ],
    },
  },
};
