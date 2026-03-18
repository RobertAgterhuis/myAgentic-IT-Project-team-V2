/**
 * Storybook stories for PipelinePage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import PipelinePage from './pipeline-page';
import { withProviders } from '@/test/storybook-decorators';
import type { ProgressResponse } from '@/lib/api-types';

const populatedProgress: ProgressResponse = {
  active: true,
  command: null,
  sprints: { total: 2, statuses: { 'SP-1': 'DONE', 'SP-2': 'IN_PROGRESS' } },
  session: {
    session_id: 'sess-001',
    cycle_type: 'FEATURE',
    status: 'RUNNING',
    current_phase: 'PHASE-2',
    current_agent: '05-software-architect',
    current_step: 'Drafting technical design',
    initiated_at: '2026-03-18T09:00:00Z',
    last_updated: '2026-03-18T09:15:00Z',
    blockers: [],
    open_human_escalations: [],
  },
  phases: [
    {
      key: 'ONBOARDING',
      label: 'Onboarding',
      status: 'done',
      done: 1,
      total: 1,
      agents: [{ id: '25', name: 'Onboarding Agent', status: 'done' }],
    },
    {
      key: 'PHASE-1',
      label: 'Phase 1 — Requirements & Strategy',
      status: 'done',
      done: 6,
      total: 6,
      agents: [
        { id: '01', name: 'Business Analyst', status: 'done' },
        { id: '02', name: 'Domain Expert', status: 'done' },
        { id: '03', name: 'Sales Strategist', status: 'done' },
        { id: '04', name: 'Financial Analyst', status: 'done' },
        { id: '34', name: 'Product Manager', status: 'done' },
        { id: 'critic_risk', name: 'Critic + Risk', status: 'done' },
      ],
    },
    {
      key: 'PHASE-2',
      label: 'Phase 2 — Architecture & Design',
      status: 'active',
      done: 1,
      total: 7,
      agents: [
        { id: '05', name: 'Software Architect', status: 'active' },
        { id: '06', name: 'Senior Developer', status: 'pending' },
        { id: '07', name: 'DevOps Engineer', status: 'pending' },
        { id: '08', name: 'Security Architect', status: 'pending' },
        { id: '09', name: 'Data Architect', status: 'pending' },
        { id: '33', name: 'Legal Counsel', status: 'pending' },
        { id: 'critic_risk', name: 'Critic + Risk', status: 'pending' },
      ],
    },
    {
      key: 'PHASE-3',
      label: 'Phase 3 — Experience Design',
      status: 'pending',
      done: 0,
      total: 7,
      agents: [
        { id: '10', name: 'UX Researcher', status: 'pending' },
        { id: '11', name: 'UX Designer', status: 'pending' },
        { id: '12', name: 'UI Designer', status: 'pending' },
        { id: '13', name: 'Accessibility Specialist', status: 'pending' },
        { id: '32', name: 'Content Strategist', status: 'pending' },
        { id: '35', name: 'Localization Specialist', status: 'pending' },
        { id: 'critic_risk', name: 'Critic + Risk', status: 'pending' },
      ],
    },
  ],
};

const needsInputProgress: ProgressResponse = {
  ...populatedProgress,
  session: {
    ...populatedProgress.session!,
    status: 'AWAITING_HUMAN',
    blockers: [
      {
        blocker_id: 'BLK-100',
        type: 'HUMAN_REQUIRED',
        description: 'Architecture trade-off needs a user decision.',
      },
    ],
    open_human_escalations: [
      {
        escalation_id: 'ESC-100',
        raised_by: 'Software Architect',
        raised_at: '2026-03-18T09:20:00Z',
        type: 'SCOPE_DECISION',
        question: 'Should the platform support multi-tenant isolation in v1?',
        timeout_action: 'PAUSE',
        timeout_at: null,
        status: 'OPEN',
        answer: null,
        answered_at: null,
      },
    ],
  },
};

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
        http.get('/api/orchestrator/status', () =>
          HttpResponse.json({ state: 'RUNNING', mode: 'FEATURE' })
        ),
        http.get('/api/progress', () => HttpResponse.json(populatedProgress)),
      ],
    },
  },
};

export const NeedsInput: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/orchestrator/status', () =>
          HttpResponse.json({ state: 'RUNNING', mode: 'FEATURE' })
        ),
        http.get('/api/progress', () => HttpResponse.json(needsInputProgress)),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/orchestrator/status', () =>
          HttpResponse.json({ state: 'IDLE', mode: 'CREATE' })
        ),
        http.get('/api/progress', () =>
          HttpResponse.json({ active: false, session: null, phases: [], command: null })
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
        http.get('/api/progress', async () => {
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
          HttpResponse.json({ state: 'ERROR', mode: 'FEATURE' }, { status: 500 })
        ),
        http.get('/api/progress', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        ),
      ],
    },
  },
};
