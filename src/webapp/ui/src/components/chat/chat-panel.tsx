import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, MessageSquare, Send, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { showToast } from '@/components/ui/toast-system';
import {
  useChatHistory,
  useClearChatSession,
  useExecuteChatAction,
  useSendChatMessage,
} from '@/hooks';
import { useUIStore } from '@/stores/ui-store';
import type { ChatProposedAction } from '@/lib/api-types';
import { ChatCitationCard } from './chat-citation';

const CHAT_SESSION_KEY = 'agentic-chat-session-id';

function getSessionId(): string {
  const fromStorage = window.localStorage.getItem(CHAT_SESSION_KEY);
  if (fromStorage && fromStorage.trim().length > 0) return fromStorage;

  const generated = `session-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(CHAT_SESSION_KEY, generated);
  return generated;
}

export function ChatPanel() {
  const navigate = useNavigate();
  const chatOpen = useUIStore((s) => s.chatOpen);
  const setChatOpen = useUIStore((s) => s.setChatOpen);
  const lastSSEEvent = useUIStore((s) => s.lastSSEEvent);

  const [sessionId, setSessionId] = useState<string>('');
  const [draft, setDraft] = useState('');
  const [streamText, setStreamText] = useState('');
  const [citations, setCitations] = useState<
    Array<{
      source_path: string;
      excerpt: string;
      start_line: number | null;
      source_type?: 'artifact' | 'decision' | 'policy' | 'session' | 'rag_chunk';
      deep_link?: string;
    }>
  >([]);
  const [actions, setActions] = useState<ChatProposedAction[]>([]);
  const [pendingAction, setPendingAction] = useState<ChatProposedAction | null>(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setChatOpen(!chatOpen);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [chatOpen, setChatOpen]);

  const history = useChatHistory(sessionId, sessionId.length > 0 && chatOpen);
  const sendMessage = useSendChatMessage(sessionId);
  const executeAction = useExecuteChatAction(sessionId);
  const clearSession = useClearChatSession(sessionId);

  useEffect(() => {
    if (!lastSSEEvent || !sessionId) return;
    if (lastSSEEvent.type === 'chat_token' && lastSSEEvent.session_id === sessionId) {
      setStreamText((current) => `${current}${String(lastSSEEvent.token || '')}`);
    }
    if (lastSSEEvent.type === 'chat_stream_complete' && lastSSEEvent.session_id === sessionId) {
      void history.refetch().finally(() => setStreamText(''));
    }
  }, [history, lastSSEEvent, sessionId]);

  const canSend = draft.trim().length > 0 && !sendMessage.isPending;

  const renderedMessages = useMemo(() => {
    const entries = history.data?.messages || [];
    if (!streamText.trim()) return entries;
    return [
      ...entries,
      {
        id: 'streaming',
        role: 'assistant' as const,
        content: streamText,
        created_at: new Date().toISOString(),
      },
    ];
  }, [history.data?.messages, streamText]);

  async function onSend(): Promise<void> {
    const message = draft.trim();
    if (!message) return;

    setDraft('');
    setStreamText('');

    try {
      const response = await sendMessage.mutateAsync({ message });
      setCitations(response.citations || []);
      setActions(response.proposed_actions || []);
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Failed to send chat message');
    }
  }

  async function runAction(action: ChatProposedAction, confirmed = false): Promise<void> {
    try {
      const response = await executeAction.mutateAsync({ action, confirmed });
      const target = response.result?.target;
      if (typeof target === 'string' && target.startsWith('/')) {
        navigate(target);
      }
      showToast.success(`Action executed: ${action.label}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      showToast.error(message);
    }
  }

  async function onActionClick(action: ChatProposedAction): Promise<void> {
    if (action.requires_confirmation) {
      setPendingAction(action);
      return;
    }
    await runAction(action, false);
  }

  async function onClearSession(): Promise<void> {
    try {
      await clearSession.mutateAsync();
      setActions([]);
      setCitations([]);
      setStreamText('');
      showToast.info('Chat session cleared');
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Failed to clear chat session');
    }
  }

  return (
    <>
      <aside
        aria-label="Chat assistant panel"
        className={[
          'fixed right-0 top-16 z-40 h-[calc(100vh-4rem)] w-full max-w-xl border-l border-border/70 bg-card/95 shadow-2xl backdrop-blur transition-transform duration-200',
          chatOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4" />
              <div>
                <h2 className="text-sm font-semibold">Chat Assistant</h2>
                <p className="text-xs text-muted-foreground">Ctrl+Shift+C to toggle</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon-xs"
                variant="outline"
                onClick={onClearSession}
                title="Clear session"
              >
                <Trash2 className="size-3.5" />
              </Button>
              <Button
                size="icon-xs"
                variant="outline"
                onClick={() => setChatOpen(false)}
                title="Close chat"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {(renderedMessages || []).map((message) => (
              <div
                key={message.id}
                className={[
                  'rounded-xl border px-3 py-2 text-sm',
                  message.role === 'assistant'
                    ? 'border-info/30 bg-info/10 text-foreground'
                    : 'border-border/70 bg-background/70 text-foreground',
                ].join(' ')}
              >
                <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                  {message.role}
                </div>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}

            {citations.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Citations
                </div>
                {citations.map((citation, index) => (
                  <ChatCitationCard
                    key={`${citation.source_path}-${index}`}
                    citation={citation}
                    onOpen={(target) => navigate(target)}
                  />
                ))}
              </div>
            )}

            {actions.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggested actions
                </div>
                <div className="space-y-2">
                  {actions.map((action) => (
                    <div
                      key={action.id}
                      className="rounded-lg border border-border/70 bg-background/50 p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Button
                          size="xs"
                          variant={action.requires_confirmation ? 'destructive' : 'outline'}
                          onClick={() => void onActionClick(action)}
                        >
                          {action.label}
                        </Button>
                        {action.impact && (
                          <Badge
                            variant={
                              action.impact === 'high'
                                ? 'destructive'
                                : action.impact === 'medium'
                                  ? 'warning'
                                  : 'success'
                            }
                            className="text-[10px]"
                          >
                            {action.impact === 'high' && <AlertCircle className="size-3 mr-0.5" />}
                            {action.impact} impact
                          </Badge>
                        )}
                      </div>
                      {action.description && (
                        <p className="mt-1.5 text-xs text-muted-foreground">{action.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/70 p-3">
            <div className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about status, approvals, or start a run..."
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void onSend();
                  }
                }}
              />
              <Button
                size="icon-sm"
                onClick={() => void onSend()}
                disabled={!canSend}
                loading={sendMessage.isPending}
                aria-label="Send message"
                title="Send message"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title="Confirm irreversible action"
        message={
          pendingAction
            ? [
                `Are you sure you want to execute '${pendingAction.label}'?`,
                pendingAction.description || 'This action may change workflow state.',
                pendingAction.impact ? `Impact level: ${pendingAction.impact}` : '',
              ]
                .filter(Boolean)
                .join(' ')
            : ''
        }
        confirmLabel="Execute action"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (!pendingAction) return;
          void runAction(pendingAction, true);
          setPendingAction(null);
        }}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
}
