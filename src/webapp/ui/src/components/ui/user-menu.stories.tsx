import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserMenu } from './user-menu';
import { ThemeProvider } from './theme-provider';
import { useAuthStore } from '@/stores/auth-store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

const meta = {
  title: 'UI/UserMenu',
  component: UserMenu,
  tags: ['autodocs'],
} satisfies Meta<typeof UserMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

function SignedInWrapper() {
  useEffect(() => {
    useAuthStore.setState({
      user: {
        id: 1,
        github_id: 1,
        login: 'operator',
        display_name: 'Operator User',
        avatar_url: '',
        role: 'operator',
      },
      loading: false,
    });
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <UserMenu />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function SignedOutWrapper() {
  useEffect(() => {
    useAuthStore.setState({ user: null, loading: false });
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <UserMenu />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export const SignedIn: Story = {
  render: () => <SignedInWrapper />,
};

export const SignedOut: Story = {
  render: () => <SignedOutWrapper />,
};
