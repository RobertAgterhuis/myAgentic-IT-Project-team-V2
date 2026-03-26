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

function buildQuestionnaire(args: {
  file: string;
  agent: string;
  phase: string;
  section: string;
  questions: Array<{
    id: string;
    question: string;
    classification: 'REQUIRED' | 'OPTIONAL';
    answer: string;
    status: 'OPEN' | 'ANSWERED' | 'DEFERRED';
  }>;
}) {
  return {
    file: args.file,
    agent: args.agent,
    phase: args.phase,
    generated: '2025-01-15T10:00:00Z',
    version: '1.0.0',
    sections: [
      {
        title: args.section,
        questions: args.questions.map((question) => ({
          ...question,
          whyNeeded: 'Required for planning and execution alignment.',
          expectedFormat: 'Short paragraph',
          example: 'Example response',
          section: args.section,
          lastUpdated: '2025-01-15T10:00:00Z',
        })),
      },
    ],
    questions: args.questions.map((question) => ({
      ...question,
      whyNeeded: 'Required for planning and execution alignment.',
      expectedFormat: 'Short paragraph',
      example: 'Example response',
      section: args.section,
      lastUpdated: '2025-01-15T10:00:00Z',
    })),
  };
}

export const Populated: Story = {
  parameters: {
    routerInitialEntries: ['/questionnaires?file=BusinessDocs/Phase1-Business/business-model.md'],
    msw: {
      handlers: [
        http.get('/api/questionnaires', () =>
          HttpResponse.json({
            questionnaires: [
              buildQuestionnaire({
                file: 'BusinessDocs/Phase1-Business/business-model.md',
                agent: 'Business Analyst',
                phase: 'Phase1-Business',
                section: 'Business Model',
                questions: [
                  {
                    id: 'q-001',
                    question: 'What customer problem is the product solving?',
                    classification: 'REQUIRED',
                    answer: 'The platform reduces delivery ambiguity across SDLC phases.',
                    status: 'ANSWERED',
                  },
                  {
                    id: 'q-002',
                    question: 'What monetization path is planned?',
                    classification: 'OPTIONAL',
                    answer: '',
                    status: 'OPEN',
                  },
                ],
              }),
              buildQuestionnaire({
                file: 'BusinessDocs/Phase2-Tech/technical-stack.md',
                agent: 'Senior Developer',
                phase: 'Phase2-Tech',
                section: 'Technical Stack',
                questions: [
                  {
                    id: 'q-003',
                    question: 'Which frontend stack is approved?',
                    classification: 'REQUIRED',
                    answer: 'React 18 with TypeScript and Vite.',
                    status: 'ANSWERED',
                  },
                ],
              }),
              buildQuestionnaire({
                file: 'BusinessDocs/Phase3-UX/ux-requirements.md',
                agent: 'UX Researcher',
                phase: 'Phase3-UX',
                section: 'UX Requirements',
                questions: [
                  {
                    id: 'q-004',
                    question: 'What accessibility baseline applies?',
                    classification: 'REQUIRED',
                    answer: '',
                    status: 'OPEN',
                  },
                ],
              }),
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
