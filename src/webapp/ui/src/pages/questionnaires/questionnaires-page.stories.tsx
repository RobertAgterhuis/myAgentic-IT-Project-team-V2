/**
 * Storybook stories for QuestionnairesPage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import QuestionnairesPage from './questionnaires-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Questionnaires',
  component: QuestionnairesPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof QuestionnairesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/questionnaires', () =>
          HttpResponse.json({
            questionnaires: [
              {
                id: 'q-001',
                title: 'Business Model',
                status: 'pending',
                phase: 'Phase1-Business',
                questions: 5,
                answered: 2,
              },
              {
                id: 'q-002',
                title: 'Technical Stack',
                status: 'completed',
                phase: 'Phase2-Tech',
                questions: 8,
                answered: 8,
              },
              {
                id: 'q-003',
                title: 'UX Requirements',
                status: 'pending',
                phase: 'Phase3-UX',
                questions: 6,
                answered: 0,
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
      handlers: [http.get('/api/questionnaires', () => HttpResponse.json({ questionnaires: [] }))],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/questionnaires', async () => {
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
        http.get('/api/questionnaires', () =>
          HttpResponse.json({ error: 'Database connection lost' }, { status: 500 })
        ),
      ],
    },
  },
};
