import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { useUIStore } from '@/stores/ui-store';
import { ChatPanel } from './chat-panel';

const hookMocks = vi.hoisted(() => ({
  refetch: vi.fn().mockResolvedValue({}),
  sendMutateAsync: vi.fn(),
  executeMutateAsync: vi.fn(),
  clearMutateAsync: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useChatHistory: () => ({
    data: {
      messages: [
        {
          id: 'm-1',
          role: 'assistant',
          content: 'Base reply',
          created_at: '2026-03-24T00:00:00.000Z',
        },
      ],
    },
    refetch: hookMocks.refetch,
  }),
  useSendChatMessage: () => ({
    isPending: false,
    mutateAsync: hookMocks.sendMutateAsync,
  }),
  useExecuteChatAction: () => ({
    mutateAsync: hookMocks.executeMutateAsync,
  }),
  useClearChatSession: () => ({
    mutateAsync: hookMocks.clearMutateAsync,
  }),
}));

function renderPanel() {
  return render(
    <RouterTestWrapper initialEntries={['/']}>
      <ChatPanel />
    </RouterTestWrapper>
  );
}

describe('ChatPanel', () => {
  beforeEach(() => {
    window.localStorage.setItem('agentic-chat-session-id', 'session-test');
    hookMocks.refetch.mockClear();
    useUIStore.setState({ chatOpen: true, lastSSEEvent: null });
  });

  // TODO(#1095): Re-enable and stabilize this test after resolving flaky local test-runner behavior.
  it.skip('renders SSE token stream incrementally and clears transient stream after completion', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText(/Base reply/i)).toBeInTheDocument();
    });

    act(() => {
      useUIStore.getState().setLastSSEEvent({
        type: 'chat_token',
        session_id: 'session-test',
        token: 'Hello ',
      });
    });

    act(() => {
      useUIStore.getState().setLastSSEEvent({
        type: 'chat_token',
        session_id: 'session-test',
        token: 'world',
      });
    });

    expect(screen.getByText('Hello world')).toBeInTheDocument();

    act(() => {
      useUIStore.getState().setLastSSEEvent({
        type: 'chat_stream_complete',
        session_id: 'session-test',
      });
    });

    await waitFor(() => {
      expect(hookMocks.refetch).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByText('Hello world')).not.toBeInTheDocument();
    });
  });
});
