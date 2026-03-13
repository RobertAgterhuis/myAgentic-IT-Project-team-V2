import type { Meta, StoryObj } from '@storybook/react';
import { AlertBanner } from './alert-banner';
import { Button } from './button';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const meta = {
  title: 'UI/AlertBanner',
  component: AlertBanner,
  tags: ['autodocs'],
} satisfies Meta<typeof AlertBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InfoBanner: Story = {
  args: {
    variant: 'info',
    icon: <Info />,
    children: 'This is an informational message.',
  },
};

export const WarningBanner: Story = {
  args: {
    variant: 'warning',
    icon: <AlertTriangle />,
    children: 'Please review the following warnings.',
  },
};

export const ErrorBanner: Story = {
  args: {
    variant: 'error',
    icon: <AlertCircle />,
    children: 'An error occurred while processing your request.',
  },
};

export const SuccessBanner: Story = {
  args: {
    variant: 'success',
    icon: <CheckCircle />,
    children: 'Operation completed successfully!',
  },
};

export const Dismissible: Story = {
  args: {
    variant: 'warning',
    icon: <AlertTriangle />,
    dismissible: true,
    children: 'You can dismiss this banner.',
  },
};

export const WithAction: Story = {
  args: {
    variant: 'error',
    icon: <AlertCircle />,
    action: (
      <Button size="sm" variant="outline">
        Retry
      </Button>
    ),
    children: 'Failed to save. Please try again.',
  },
};
