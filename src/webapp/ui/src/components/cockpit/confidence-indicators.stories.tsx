import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfidenceBadge, ConfidenceCard, ConfidencePanel } from './confidence-indicators';
import type { ConfidenceScore } from '@/lib/api-types';

const metaBadge = {
  title: 'Cockpit/ConfidenceBadge',
  component: ConfidenceBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof ConfidenceBadge>;
export default metaBadge;
type BadgeStory = StoryObj<typeof metaBadge>;

export const High: BadgeStory = {
  args: {
    score: { label: 'Business', score: 92, factors: [{ label: 'Coverage', value: 92, weight: 1 }] },
  },
};
export const Medium: BadgeStory = {
  args: {
    score: { label: 'Tech', score: 65, factors: [{ label: 'Architecture', value: 65, weight: 1 }] },
  },
};
export const Low: BadgeStory = {
  args: {
    score: { label: 'Security', score: 35, factors: [{ label: 'OWASP', value: 35, weight: 1 }] },
  },
};

/* ── Card stories exported separately ── */
const _metaCard = {
  title: 'Cockpit/ConfidenceCard',
  component: ConfidenceCard,
  tags: ['autodocs'],
} satisfies Meta<typeof ConfidenceCard>;

type CardStory = StoryObj<typeof _metaCard>;

const sampleScore: ConfidenceScore = {
  label: 'Architecture',
  score: 78,
  factors: [
    { label: 'Pattern compliance', weight: 0.4, value: 85 },
    { label: 'Security coverage', weight: 0.3, value: 70 },
    { label: 'Documentation', weight: 0.3, value: 72 },
  ],
};

export const CardDefault: CardStory = {
  args: { score: sampleScore },
  render: (args) => <ConfidenceCard {...args} />,
};

/* ── Panel stories ── */
const _metaPanel = {
  title: 'Cockpit/ConfidencePanel',
  component: ConfidencePanel,
  tags: ['autodocs'],
} satisfies Meta<typeof ConfidencePanel>;

type PanelStory = StoryObj<typeof _metaPanel>;

const sessionHealth: ConfidenceScore = {
  label: 'Session Health',
  score: 88,
  factors: [
    { label: 'Requirements coverage', weight: 0.5, value: 90 },
    { label: 'Stakeholder alignment', weight: 0.5, value: 86 },
  ],
};

const sprintReadiness: ConfidenceScore = {
  label: 'Sprint Readiness',
  score: 62,
  factors: [
    { label: 'Architecture', weight: 0.4, value: 70 },
    { label: 'Security', weight: 0.3, value: 48 },
    { label: 'Testing', weight: 0.3, value: 66 },
  ],
};

const agentConfidence: ConfidenceScore = {
  label: 'Agent Confidence',
  score: 41,
  factors: [
    { label: 'Accessibility', weight: 0.5, value: 35 },
    { label: 'Usability', weight: 0.5, value: 47 },
  ],
};

export const PanelTypical: PanelStory = {
  args: { sessionHealth, sprintReadiness, agentConfidence },
  render: (args) => <ConfidencePanel {...args} />,
};

export const PanelEmpty: PanelStory = {
  args: {
    sessionHealth: { label: 'Session Health', score: 0, factors: [] },
    sprintReadiness: { label: 'Sprint Readiness', score: 0, factors: [] },
    agentConfidence: { label: 'Agent Confidence', score: 0, factors: [] },
  },
  render: (args) => <ConfidencePanel {...args} />,
};
