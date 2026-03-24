/**
 * Questionnaires page — sidebar nav by phase, answer forms, save/draft.
 * Issue #242 (S9G-35)
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heading, Text } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { InputField } from '@/components/ui/input-field';
import { ProgressBar } from '@/components/ui/progress';
import { SidePanel, type NavSection } from '@/components/ui/side-panel';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { useQuestionnaires, useQuestionnaire, useSaveQuestionnaire } from '@/hooks';
import type { QuestionnaireQuestion, QuestionUpdate } from '@/lib/api-types';
import { ClipboardList, Save, Search, FileQuestion, RefreshCw } from 'lucide-react';

/* ── Status badge mapping ── */
const statusVariant: Record<string, 'success' | 'warning' | 'secondary'> = {
  ANSWERED: 'success',
  OPEN: 'warning',
  DEFERRED: 'secondary',
};

/* ── Question Row ── */
function QuestionRow({
  question,
  draft,
  onDraftChange,
}: {
  question: QuestionnaireQuestion;
  draft: string | undefined;
  onDraftChange: (id: string, value: string) => void;
}) {
  const value = draft ?? question.answer;

  return (
    <div className="space-y-2 rounded-lg border p-4" data-testid={`question-${question.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[question.status] ?? 'secondary'} className="text-xs">
              {question.status}
            </Badge>
            {question.classification === 'REQUIRED' && (
              <Badge variant="error" className="text-xs">
                REQUIRED
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium">{question.question}</p>
          {question.whyNeeded && (
            <p className="text-xs text-muted-foreground">Why: {question.whyNeeded}</p>
          )}
        </div>
      </div>

      <InputField
        label="Answer"
        placeholder={question.expectedFormat || question.example || 'Enter your answer…'}
        value={value}
        onChange={(e) => onDraftChange(question.id, e.target.value)}
        helperText={question.example ? `Example: ${question.example}` : undefined}
      />
    </div>
  );
}

/* ── Main Page ── */
export default function QuestionnairesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, error, refetch } = useQuestionnaires();
  const save = useSaveQuestionnaire();
  const [selectedFile, setSelectedFile] = useState<string | undefined>(() => {
    const raw = searchParams.get('file');
    return raw || undefined;
  });
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedFile) next.set('file', selectedFile);
    if (searchTerm.trim()) next.set('q', searchTerm.trim());
    setSearchParams(next, { replace: true });
  }, [selectedFile, searchTerm, setSearchParams]);

  const draftHistoryKey = selectedFile ? `questionnaire-draft-history:${selectedFile}` : null;

  useEffect(() => {
    if (!draftHistoryKey) return;
    const raw = localStorage.getItem(draftHistoryKey);
    if (!raw) return;
    try {
      const entries = JSON.parse(raw) as Array<{ drafts: Record<string, string> }>;
      const latest = entries[entries.length - 1];
      if (latest?.drafts && Object.keys(latest.drafts).length > 0) {
        setDrafts(latest.drafts);
      }
    } catch {
      // Ignore malformed local draft history.
    }
  }, [draftHistoryKey]);

  const questionnaires = useMemo(() => data?.questionnaires ?? [], [data]);

  // Build sidebar sections grouped by phase
  const sections: NavSection[] = useMemo(() => {
    const grouped = new Map<string, typeof questionnaires>();
    for (const q of questionnaires) {
      const phase = q.phase || 'Other';
      if (!grouped.has(phase)) grouped.set(phase, []);
      grouped.get(phase)!.push(q);
    }

    return Array.from(grouped.entries()).map(([phase, items]) => {
      const answered = items
        .flatMap((q) => q.questions)
        .filter((q) => q.status === 'ANSWERED').length;
      const total = items.flatMap((q) => q.questions).length;

      return {
        id: phase,
        title: phase,
        progress: total > 0 ? Math.round((answered / total) * 100) : 0,
        items: items.map((q) => ({
          id: q.file,
          label: q.agent || q.file.replace(/^.*\//, '').replace(/\.md$/, ''),
        })),
      };
    });
  }, [questionnaires]);

  // Selected questionnaire
  const { data: selected } = useQuestionnaire(selectedFile);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    if (!selected) return [];
    const term = searchTerm.toLowerCase();
    if (!term) return selected.questions;
    return selected.questions.filter(
      (q) =>
        q.question.toLowerCase().includes(term) ||
        q.section.toLowerCase().includes(term) ||
        q.answer.toLowerCase().includes(term)
    );
  }, [selected, searchTerm]);

  // Draft handling
  const handleDraftChange = useCallback(
    (id: string, value: string) => {
      setDrafts((prev) => {
        const next = { ...prev, [id]: value };
        if (draftHistoryKey) {
          try {
            const historyRaw = localStorage.getItem(draftHistoryKey);
            const history = historyRaw
              ? (JSON.parse(historyRaw) as Array<{ at: string; drafts: Record<string, string> }>)
              : [];
            history.push({ at: new Date().toISOString(), drafts: next });
            const bounded = history.slice(-10);
            localStorage.setItem(draftHistoryKey, JSON.stringify(bounded));
          } catch {
            // Ignore malformed local draft history.
          }
        }
        return next;
      });
    },
    [draftHistoryKey]
  );

  const restoreLatestDraft = useCallback(() => {
    if (!draftHistoryKey) return;
    const raw = localStorage.getItem(draftHistoryKey);
    if (!raw) return;
    try {
      const entries = JSON.parse(raw) as Array<{ drafts: Record<string, string> }>;
      const latest = entries[entries.length - 1];
      if (latest?.drafts) {
        setDrafts(latest.drafts);
      }
    } catch {
      // Ignore malformed draft history.
    }
  }, [draftHistoryKey]);

  // Save handler
  function handleSave() {
    if (!selectedFile || !selected) return;

    const updates: QuestionUpdate[] = Object.entries(drafts)
      .filter(([id]) => selected.questions.some((q) => q.id === id))
      .map(([questionId, answer]) => ({
        questionId,
        answer,
        status: answer.trim() ? ('ANSWERED' as const) : ('OPEN' as const),
      }));

    if (updates.length === 0) return;

    save.mutate(
      { file: selectedFile, updates },
      {
        onSuccess: () => setDrafts({}),
      }
    );
  }

  // Stats for selected questionnaire
  const stats = useMemo(() => {
    if (!selected) return null;
    const total = selected.questions.length;
    const answered = selected.questions.filter((q) => q.status === 'ANSWERED').length;
    const required = selected.questions.filter((q) => q.classification === 'REQUIRED').length;
    const requiredAnswered = selected.questions.filter(
      (q) => q.classification === 'REQUIRED' && q.status === 'ANSWERED'
    ).length;
    return { total, answered, required, requiredAnswered };
  }, [selected]);

  const dirtyCount = Object.keys(drafts).length;
  const contextItems: ContextStripItem[] = [
    {
      id: 'questionnaires-total',
      label: 'Questionnaires',
      value: String(questionnaires.length),
      tone: questionnaires.length > 0 ? 'info' : 'neutral',
    },
    {
      id: 'questionnaires-selected',
      label: 'Selected',
      value: selected?.agent || 'None',
      tone: selected ? 'success' : 'neutral',
    },
    {
      id: 'questionnaires-dirty',
      label: 'Dirty drafts',
      value: String(dirtyCount),
      tone: dirtyCount > 0 ? 'warning' : 'success',
    },
    {
      id: 'questionnaires-search',
      label: 'Search',
      value: searchTerm.trim() ? 'Filtered' : 'All questions',
      tone: searchTerm.trim() ? 'info' : 'neutral',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading questionnaires…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load questionnaires: {(error as Error).message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3 mr-1.5" /> Retry
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }

  return (
    <div className="flex h-full" data-testid="questionnaires-page">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r overflow-y-auto">
        <div className="p-4 border-b">
          <Heading level={1} className="text-lg">
            Questionnaires
          </Heading>
        </div>
        <SidePanel
          sections={sections}
          activeItemId={selectedFile}
          onItemSelect={(id) => {
            setSelectedFile(id);
            setDrafts({});
            setSearchTerm('');
          }}
          aria-label="Questionnaire navigation"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <PageHeader
          title="Questionnaires"
          subtitle="Answer and track phase questionnaires with explicit required coverage and draft state."
          chips={[
            {
              id: 'questionnaires-chip-selected',
              label: selected?.phase ?? 'No selection',
              tone: selected ? 'info' : 'default',
            },
            {
              id: 'questionnaires-chip-drafts',
              label: `${dirtyCount} drafts`,
              tone: dirtyCount > 0 ? 'warning' : 'success',
            },
          ]}
          actions={
            selectedFile ? (
              <Button
                onClick={handleSave}
                disabled={dirtyCount === 0 || save.isPending}
                loading={save.isPending}
              >
                <Save className="size-4 mr-2" />
                Save ({dirtyCount})
              </Button>
            ) : undefined
          }
        />

        {selectedFile && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={restoreLatestDraft}>
              Restore latest draft
            </Button>
          </div>
        )}

        <ContextStrip items={contextItems} />

        {!selectedFile ? (
          <EmptyState
            icon={<ClipboardList className="size-12" />}
            title="Select a questionnaire"
            description="Choose a questionnaire from the sidebar to view and answer questions."
          />
        ) : selected ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <Heading level={2}>{selected.agent || 'Questionnaire'}</Heading>
                <Text muted>
                  {selected.phase} — v{selected.version}
                </Text>
              </div>
            </div>

            {/* Progress */}
            {stats && (
              <div className="grid grid-cols-2 gap-4">
                <Card elevation="flat" className="p-4">
                  <ProgressBar
                    value={stats.answered}
                    max={stats.total}
                    label="Overall progress"
                    showPercentage
                  />
                </Card>
                <Card elevation="flat" className="p-4">
                  <ProgressBar
                    value={stats.requiredAnswered}
                    max={stats.required}
                    label="Required questions"
                    showPercentage
                  />
                </Card>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Search questions…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search questions"
              />
            </div>

            {/* Questions */}
            {filteredQuestions.length === 0 ? (
              <EmptyState
                icon={<FileQuestion className="size-10" />}
                title="No matching questions"
                description="Try adjusting your search term."
              />
            ) : (
              <div className="space-y-4">
                {filteredQuestions.map((q) => (
                  <QuestionRow
                    key={q.id}
                    question={q}
                    draft={drafts[q.id]}
                    onDraftChange={handleDraftChange}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={<FileQuestion className="size-10" />}
            title="Questionnaire not found"
            description="The selected questionnaire could not be loaded."
          />
        )}
      </div>
    </div>
  );
}
