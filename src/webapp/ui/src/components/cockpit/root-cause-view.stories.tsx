import type { Meta, StoryObj } from '@storybook/react-vite';
import { RootCauseView } from './root-cause-view';
import type { RootCauseEntry } from '@/lib/api-types';

const meta = {
  title: 'Cockpit/RootCauseView',
  component: RootCauseView,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof RootCauseView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { items: [] },
};

const items: RootCauseEntry[] = [
  {
    id: 'rc-1',
    type: 'gate_failure',
    summary: 'Phase 2 gate failed — security review not completed',
    cause_chain: [
      'Security Architect agent was not invoked during Phase 2',
      'Missing OWASP baseline check in guardrails',
      'No security questionnaire answers provided',
    ],
    source_agent: 'Critic',
    source_file: 'BusinessDocs/Phase2-Tech/critic-report.md',
    source_line: 42,
    timestamp: new Date(Date.now() - 3_600_000).toISOString(),
    actionable_link: '#q-sec-001',
    actionable_type: 'questionnaire',
  },
  {
    id: 'rc-2',
    type: 'uncertain',
    summary: 'UNCERTAIN: target user persona not validated',
    cause_chain: [
      'UX Researcher flagged persona assumptions as unverified',
      'No user interview data available',
    ],
    source_agent: 'UX Researcher',
    source_file: 'BusinessDocs/Phase3-UX/ux-analysis.md',
    source_line: 15,
    timestamp: new Date(Date.now() - 7_200_000).toISOString(),
    actionable_link: '#q-ux-002',
    actionable_type: 'questionnaire',
  },
  {
    id: 'rc-3',
    type: 'insufficient_data',
    summary: 'INSUFFICIENT_DATA: pricing model not defined',
    cause_chain: [
      'Financial Analyst could not generate revenue projections',
      'No pricing questionnaire answers',
      'Competitor pricing data unavailable',
    ],
    source_agent: 'Financial Analyst',
    timestamp: new Date(Date.now() - 10_800_000).toISOString(),
    actionable_link: '#d-pricing-001',
    actionable_type: 'decision',
  },
  {
    id: 'rc-4',
    type: 'sprint_blocked',
    summary: 'Sprint 2 blocked by unresolved GDPR decision',
    cause_chain: [
      'Decision D-GDPR-001 still in OPEN status',
      'Legal Counsel flagged data residency requirements',
    ],
    source_agent: 'Orchestrator',
    source_file: 'BusinessDocs/decisions.md',
    timestamp: new Date(Date.now() - 14_400_000).toISOString(),
    actionable_link: '#D-GDPR-001',
    actionable_type: 'decision',
  },
];

export const Typical: Story = {
  args: {
    items,
    onNavigate: (_link, _type) => {},
  },
};

export const SingleItem: Story = {
  args: {
    items: [items[0]],
  },
};
