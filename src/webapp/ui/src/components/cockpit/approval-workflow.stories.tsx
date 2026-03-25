import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApprovalDetailPanel, ApprovalHistoryTimeline } from './approval-workflow';
import type { ApprovalEntry } from '@/lib/api-types';

/* ── Detail Panel ── */
const metaDetail = {
  title: 'Cockpit/ApprovalDetailPanel',
  component: ApprovalDetailPanel,
  tags: ['autodocs'],
} satisfies Meta<typeof ApprovalDetailPanel>;

export default metaDetail;
type DetailStory = StoryObj<typeof metaDetail>;

const sampleApproval: ApprovalEntry = {
  id: 'appr-001',
  entity_id: 'entity-arch-01',
  gate_id: 'phase2-gate',
  stage: 'PHASE-2',
  requested_by: 'Software Architect',
  requested_at: new Date(Date.now() - 3_600_000).toISOString(),
  required_role: 'lead',
  status: 'PENDING',
};

export const Pending: DetailStory = {
  args: {
    approval: sampleApproval,
  },
};

export const Approved: DetailStory = {
  args: {
    approval: { ...sampleApproval, status: 'APPROVED' },
  },
};

/* ── History Timeline ── */
const _metaHistory = {
  title: 'Cockpit/ApprovalHistoryTimeline',
  component: ApprovalHistoryTimeline,
  tags: ['autodocs'],
} satisfies Meta<typeof ApprovalHistoryTimeline>;

type HistoryStory = StoryObj<typeof _metaHistory>;

export const HistoryTypical: HistoryStory = {
  render: () => <ApprovalHistoryTimeline />,
};

export const HistoryWithClass: HistoryStory = {
  render: () => <ApprovalHistoryTimeline className="max-w-2xl" />,
};
