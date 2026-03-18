import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Badge } from './badge';
import { Sparkles } from 'lucide-react';

/* ---------- EmptyState ---------- */

interface EmptyStateProps extends React.ComponentProps<'div'> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-[28px] border border-border/70 bg-gradient-to-br from-card via-card to-info/6 px-6 py-12 text-center shadow-sm backdrop-blur-sm',
        className
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-info)_10%,transparent)_0%,transparent_30%),radial-gradient(circle_at_bottom_right,color-mix(in_srgb,var(--color-secondary)_10%,transparent)_0%,transparent_28%)]"
      />
      <Badge variant="outline" className="relative border-info/20 bg-background/70 text-foreground">
        <Sparkles className="size-3.5" />
        Ready for next action
      </Badge>
      {icon && (
        <div className="relative flex size-16 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground shadow-sm">
          {icon}
        </div>
      )}
      <p className="relative text-lg font-semibold text-foreground">{title}</p>
      {description && (
        <p className="relative max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button variant="outline" onClick={action.onClick} className="relative mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}

/* ---------- ErrorBoundary ---------- */

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <EmptyState
          title="Something went wrong"
          description={this.state.error.message}
          action={{ label: 'Try again', onClick: this.reset }}
        />
      );
    }
    return this.props.children;
  }
}

export { EmptyState, ErrorBoundary };
export type { EmptyStateProps, ErrorBoundaryProps };
