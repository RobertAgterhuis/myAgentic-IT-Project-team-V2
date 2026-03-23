import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ChatCitation, ChatCitationSourceType } from '@/lib/api-types';

interface ChatCitationProps {
  citation: ChatCitation;
  onOpen?: (path: string) => void;
}

const badgeVariantByType: Record<
  ChatCitationSourceType,
  'secondary' | 'info' | 'warning' | 'outline'
> = {
  artifact: 'secondary',
  decision: 'info',
  policy: 'warning',
  session: 'outline',
  rag_chunk: 'secondary',
};

function sourceLabel(type?: ChatCitationSourceType): string {
  switch (type) {
    case 'artifact':
      return 'Artifact';
    case 'decision':
      return 'Decision';
    case 'policy':
      return 'Policy';
    case 'session':
      return 'Session';
    case 'rag_chunk':
      return 'RAG';
    default:
      return 'Source';
  }
}

export function ChatCitationCard({ citation, onOpen }: ChatCitationProps) {
  const lineSuffix = citation.start_line != null ? `:${citation.start_line}` : '';

  return (
    <div className="rounded-lg border border-border/70 bg-background/70 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant={badgeVariantByType[citation.source_type || 'rag_chunk']}>
          {sourceLabel(citation.source_type)}
        </Badge>
        <span className="truncate text-muted-foreground" title={citation.source_path}>
          {citation.source_path}
          {lineSuffix}
        </span>
      </div>
      <p className="line-clamp-3 text-muted-foreground">{citation.excerpt}</p>
      {citation.deep_link && (
        <div className="mt-2">
          <Button
            size="xs"
            variant="outline"
            onClick={() => onOpen?.(citation.deep_link as string)}
            type="button"
          >
            Open source
          </Button>
        </div>
      )}
    </div>
  );
}
