/**
 * Storybook decorator — provides QueryClientProvider + MemoryRouter for page stories.
 * M21-006
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { Decorator } from '@storybook/react-vite';

export function createStoryQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

export const withProviders: Decorator = (Story, context) => {
  const initialEntries = context.parameters?.routerInitialEntries ?? ['/'];
  const qc = React.useMemo(() => createStoryQueryClient(), []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        <Story />
      </MemoryRouter>
    </QueryClientProvider>
  );
};
