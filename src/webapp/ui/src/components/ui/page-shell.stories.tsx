import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageShell } from './page-shell';
import { Inbox, FileText, ShieldOff } from 'lucide-react';

const meta = {
  title: 'UI/PageShell',
  component: PageShell,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    isLoading: true,
    loadingLabel: 'Loading sessions…',
    children: <div>Content (hidden while loading)</div>,
  },
};

export const LoadingCustomLabel: Story = {
  args: {
    isLoading: true,
    loadingLabel: 'Fetching governance data…',
    children: <div>Content</div>,
  },
};

export const ErrorWithRetry: Story = {
  args: {
    error: new Error('Network request failed: 500 Internal Server Error'),
    onRetry: () => alert('Retrying…'),
    children: <div>Content (hidden on error)</div>,
  },
};

export const ErrorWithoutRetry: Story = {
  args: {
    error: new Error('Permission denied'),
    children: <div>Content (hidden on error)</div>,
  },
};

export const EmptyWithAction: Story = {
  args: {
    isEmpty: true,
    emptyState: {
      icon: <Inbox className="size-12" />,
      title: 'No sessions found',
      description: 'Start a new project to see sessions here.',
      action: { label: 'Create Project', onClick: () => alert('Creating…') },
    },
    children: <div>Content (hidden when empty)</div>,
  },
};

export const EmptyMinimal: Story = {
  args: {
    isEmpty: true,
    emptyState: {
      title: 'Nothing here yet',
    },
    children: <div>Content</div>,
  },
};

export const Populated: Story = {
  args: {
    children: (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Page Content</h1>
        <p className="text-muted-foreground">
          This is the normal populated state — data loaded successfully.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded p-4">
              <FileText className="size-5 mb-2" />
              <p className="font-medium">Item {i}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
};

export const ErrorThenRetry: Story = {
  name: 'Error → Retry flow',
  args: {
    error: new Error('ECONNREFUSED: Connection refused'),
    onRetry: () => alert('Retry triggered — in a real app this calls refetch()'),
    children: <div>Content after successful retry</div>,
  },
};

export const NoAccess: Story = {
  args: {
    isNoAccess: true,
    noAccessState: {
      icon: <ShieldOff className="size-12" />,
      title: 'Access restricted',
      description: 'Your current role does not have permission to access this section.',
      action: { label: 'Request access', onClick: () => alert('Requesting access…') },
    },
    children: <div>Hidden content</div>,
  },
};
