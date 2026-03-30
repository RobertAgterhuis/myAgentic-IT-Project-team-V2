import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { usePageHelp } from '@/hooks/use-help';
import { TestWrapper } from '@/test/test-wrapper';
import { server } from '@/test/msw-server';

const pageFixture = {
  routeSlug: 'admin/mcp',
  routePath: '/admin/mcp',
  pageTitle: 'MCP Admin',
  purpose: 'Manage MCP access.',
  coreActions: [],
  inputsOutputs: 'configs in, policy out',
  permissions: 'Admin',
  relatedPages: [],
  keywords: ['mcp'],
  topicLinks: [],
};

describe('usePageHelp', () => {
  it('returns page help when the exact route slug resolves', async () => {
    // MSW default handler resolves 'commands' directly (see msw-handlers.ts)
    const { result } = renderHook(() => usePageHelp('commands'), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.routeSlug).toBe('commands');
  });

  it('falls back to a parent route slug when the exact slug returns 404', async () => {
    // Override: deep slug returns 404, parent slug returns a fixture
    server.use(
      http.get('/api/v1/help/page/:routeSlug', ({ params }) => {
        const slug = String(params.routeSlug ?? '');
        if (slug === 'admin/mcp/agents/detail') {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        }
        if (slug === 'admin/mcp/agents') {
          return HttpResponse.json({ ...pageFixture, routeSlug: slug });
        }
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      })
    );

    const { result } = renderHook(() => usePageHelp('admin/mcp/agents/detail'), {
      wrapper: TestWrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.routeSlug).toBe('admin/mcp/agents');
  });

  it('returns null when no candidate resolves', async () => {
    server.use(
      http.get('/api/v1/help/page/:routeSlug', () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })
      )
    );

    const { result } = renderHook(() => usePageHelp('totally/unknown/deep/route'), {
      wrapper: TestWrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
