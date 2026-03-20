import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './app-layout';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

const meta = {
  title: 'Layout/AppLayout',
  component: AppLayout,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

function LayoutStory() {
  useEffect(() => {
    const prev = window.EventSource;
    (window as unknown as { EventSource?: typeof EventSource }).EventSource = undefined;
    return () => {
      (window as unknown as { EventSource?: typeof EventSource }).EventSource = prev;
    };
  }, []);

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
    useUIStore.setState({
      sidebarOpen: true,
      helpOpen: false,
      connectionStatus: 'connected',
    });
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div className="p-6">App layout preview</div>} />
              <Route path="commands" element={<div className="p-6">Commands content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export const Default: Story = {
  render: () => <LayoutStory />,
};
