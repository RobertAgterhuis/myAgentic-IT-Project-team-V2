import { useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { X, BookOpenText, Link2, ListTree, Loader2 } from 'lucide-react';
import { useHelpTopic, usePageHelp, resolveHelpRouteSlug } from '@/hooks';
import { useUIStore } from '@/stores/ui-store';

interface HelpPanelProps {
  onClose: () => void;
}

export function HelpPanel({ onClose }: HelpPanelProps) {
  const location = useLocation();
  const helpRouteSlug = useUIStore((s) => s.helpRouteSlug);
  const helpTopicId = useUIStore((s) => s.helpTopicId);
  const setHelpTopic = useUIStore((s) => s.setHelpTopic);
  const openHelpForRoute = useUIStore((s) => s.openHelpForRoute);

  const routeSlug = helpRouteSlug || resolveHelpRouteSlug(location.pathname);
  const { data: pageHelp, isLoading: isPageLoading } = usePageHelp(routeSlug);
  const activeTopicId = helpTopicId ?? pageHelp?.topicLinks[0]?.topicId ?? null;
  const { data: topic, isLoading: isTopicLoading } = useHelpTopic(activeTopicId);

  useEffect(() => {
    if (!helpTopicId && pageHelp?.topicLinks[0]?.topicId) {
      setHelpTopic(pageHelp.topicLinks[0].topicId);
    }
  }, [helpTopicId, pageHelp, setHelpTopic]);

  const topicDocument = useMemo(() => enrichTopicHtml(topic?.html ?? ''), [topic?.html]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45"
      onClick={handleBackdropClick}
      role="dialog"
      aria-label="Page help drawer"
      aria-modal="true"
    >
      <aside className="flex h-full w-full max-w-3xl animate-in slide-in-from-right-8 duration-200 border-l border-border bg-card/95 shadow-2xl backdrop-blur">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <BookOpenText className="size-5" />
            <span className="font-semibold">Help</span>
          </div>
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">
                {pageHelp?.pageTitle || 'Page Help'}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {pageHelp?.purpose || 'No contextual help configured for this route.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Close help"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-12">
            <div className="col-span-9 min-h-0 overflow-y-auto p-5">
              {isPageLoading || isTopicLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading help content...
                </div>
              ) : topic ? (
                <article
                  className={cn(
                    'prose prose-slate max-w-none dark:prose-invert',
                    'prose-headings:scroll-mt-20 prose-a:text-info hover:prose-a:text-info/80'
                  )}
                  dangerouslySetInnerHTML={{ __html: topicDocument.html }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Help content for this page is not available yet.
                </p>
              )}
            </div>

            <div className="col-span-3 min-h-0 overflow-y-auto border-l px-4 py-5">
              <section>
                <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ListTree className="size-3.5" />
                  Topics
                </h3>
                <ul className="space-y-1 text-sm">
                  {(pageHelp?.topicLinks || []).map((topicLink) => {
                    const active = topicLink.topicId === activeTopicId;
                    return (
                      <li key={topicLink.topicId}>
                        <button
                          type="button"
                          className={cn(
                            'w-full rounded px-2 py-1 text-left hover:bg-muted',
                            active && 'bg-muted font-medium'
                          )}
                          onClick={() => setHelpTopic(topicLink.topicId)}
                        >
                          {topicLink.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="mt-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  On this page
                </h3>
                <ul className="space-y-1 text-xs">
                  {topicDocument.headings.length === 0 && (
                    <li className="text-muted-foreground">No section headings</li>
                  )}
                  {topicDocument.headings.map((heading) => (
                    <li key={heading.id}>
                      <a
                        href={`#${heading.id}`}
                        className={cn(
                          'block rounded py-1 hover:bg-muted',
                          heading.level <= 1 && 'pl-2',
                          heading.level === 2 && 'pl-4',
                          heading.level >= 3 && 'pl-6'
                        )}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-5">
                <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Link2 className="size-3.5" />
                  Related pages
                </h3>
                <ul className="space-y-1 text-sm">
                  {(pageHelp?.relatedPages || []).map((related) => (
                    <li key={related.routeSlug}>
                      <Link
                        to={`/${related.routeSlug}`}
                        className="block rounded px-2 py-1 hover:bg-muted"
                        onClick={() => openHelpForRoute(related.routeSlug)}
                      >
                        {related.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

interface HeadingEntry {
  id: string;
  level: number;
  text: string;
}

function enrichTopicHtml(html: string): { html: string; headings: HeadingEntry[] } {
  if (!html) {
    return { html: '', headings: [] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headings: HeadingEntry[] = [];
  const seenIds = new Set<string>();

  doc.querySelectorAll('h1, h2, h3').forEach((heading) => {
    const level = Number.parseInt(heading.tagName.replace('H', ''), 10);
    const text = heading.textContent?.trim() || '';
    const id = heading.id || buildHeadingId(text, seenIds);
    heading.id = id;
    seenIds.add(id);
    if (text) {
      headings.push({ id, level, text });
    }
  });

  return {
    html: doc.body.innerHTML,
    headings,
  };
}

function buildHeadingId(text: string, seenIds: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'section';

  if (!seenIds.has(base)) {
    return base;
  }

  let suffix = 2;
  while (seenIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}
