import type { Meta, StoryObj } from '@storybook/react-vite';
import { InteractiveLineageGraph } from './interactive-lineage-graph';

const meta = {
  title: 'Cockpit/InteractiveLineageGraph',
  component: InteractiveLineageGraph,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof InteractiveLineageGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { nodes: [], edges: [] },
};

export const SimpleChain: Story = {
  args: {
    nodes: [
      { id: 'a1', artifact_type: 'document', status: 'VALID', stage: 'PHASE-1' },
      { id: 'a2', artifact_type: 'config', status: 'VALID', stage: 'PHASE-1' },
      { id: 'a3', artifact_type: 'document', status: 'DRAFT', stage: 'PHASE-1' },
    ],
    edges: [
      { source: 'a1', target: 'a2', relationship: 'PRODUCES' },
      { source: 'a2', target: 'a3', relationship: 'CONSUMES' },
    ],
    className: 'h-[400px]',
  },
};

export const ComplexDag: Story = {
  args: {
    nodes: [
      { id: 'n1', artifact_type: 'document', status: 'VALID', stage: 'PHASE-1' },
      { id: 'n2', artifact_type: 'document', status: 'VALID', stage: 'PHASE-2' },
      { id: 'n3', artifact_type: 'design', status: 'VALID', stage: 'PHASE-3' },
      { id: 'n4', artifact_type: 'plan', status: 'DRAFT', stage: 'PHASE-2' },
      { id: 'n5', artifact_type: 'document', status: 'DRAFT', stage: 'PHASE-2' },
      { id: 'n6', artifact_type: 'design', status: 'SUPERSEDED', stage: 'PHASE-3' },
      { id: 'n7', artifact_type: 'config', status: 'DRAFT', stage: 'PHASE-4' },
    ],
    edges: [
      { source: 'n1', target: 'n2', relationship: 'PRODUCES' },
      { source: 'n1', target: 'n3', relationship: 'PRODUCES' },
      { source: 'n2', target: 'n4', relationship: 'CONSUMES' },
      { source: 'n3', target: 'n4', relationship: 'CONSUMES' },
      { source: 'n2', target: 'n5', relationship: 'PRODUCES' },
      { source: 'n3', target: 'n6', relationship: 'SUPERSEDES' },
      { source: 'n6', target: 'n7', relationship: 'PRODUCES' },
    ],
    className: 'h-[500px]',
  },
};

export const SingleNode: Story = {
  args: {
    nodes: [{ id: 'solo', artifact_type: 'document', status: 'VALID', stage: 'PHASE-1' }],
    edges: [],
    className: 'h-[300px]',
  },
};
