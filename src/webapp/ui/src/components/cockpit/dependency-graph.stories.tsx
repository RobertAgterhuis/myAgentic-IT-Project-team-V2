import type { Meta, StoryObj } from '@storybook/react-vite';
import { DependencyGraph } from './dependency-graph';
import type { DependencyNode, DependencyEdge } from '@/lib/api-types';

const meta = {
  title: 'Cockpit/DependencyGraph',
  component: DependencyGraph,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DependencyGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { nodes: [], edges: [], criticalPath: [] },
};

const nodes: DependencyNode[] = [
  { id: 'q1', label: 'Tech Stack Questionnaire', type: 'questionnaire', status: 'resolved' },
  { id: 'q2', label: 'Compliance Questionnaire', type: 'questionnaire', status: 'pending' },
  { id: 'd1', label: 'Use React + TypeScript', type: 'decision', status: 'resolved' },
  { id: 'd2', label: 'GDPR Compliance', type: 'decision', status: 'pending' },
  { id: 'g1', label: 'Phase 2 Gate', type: 'gate', status: 'passed' },
  { id: 'g2', label: 'Phase 3 Gate', type: 'gate', status: 'blocked' },
  { id: 's1', label: 'Sprint 1 — Foundation', type: 'sprint', status: 'resolved' },
  { id: 's2', label: 'Sprint 2 — Features', type: 'sprint', status: 'pending' },
];

const edges: DependencyEdge[] = [
  { source: 'q1', target: 'd1', relationship: 'feeds', critical: false },
  { source: 'q2', target: 'd2', relationship: 'feeds', critical: true },
  { source: 'd1', target: 'g1', relationship: 'blocks', critical: false },
  { source: 'd2', target: 'g2', relationship: 'blocks', critical: true },
  { source: 'g1', target: 's1', relationship: 'requires', critical: false },
  { source: 'g2', target: 's2', relationship: 'requires', critical: true },
];

export const Typical: Story = {
  args: { nodes, edges, criticalPath: ['q2', 'd2', 'g2', 's2'] },
};

export const NoCriticalPath: Story = {
  args: {
    nodes: nodes.slice(0, 4),
    edges: [
      { source: 'q1', target: 'd1', relationship: 'feeds', critical: false },
      { source: 'q2', target: 'd2', relationship: 'feeds', critical: false },
    ],
    criticalPath: [],
  },
};

export const SingleColumn: Story = {
  args: {
    nodes: [{ id: 'x1', label: 'Questionnaire A', type: 'questionnaire', status: 'resolved' }],
    edges: [],
    criticalPath: [],
  },
};
