import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

/* ---------- ProgressBar ---------- */

interface ProgressBarProps extends React.ComponentProps<'div'> {
  value: number; // 0–100
  max?: number;
  label?: string;
  showPercentage?: boolean;
}

function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = false,
  className,
  ...props
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('grid gap-1', className)} {...props}>
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && <span className="font-medium">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-in-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- StepIndicator ---------- */

type StepStatus = 'completed' | 'active' | 'upcoming';

interface Step {
  label: string;
  status: StepStatus;
}

interface StepIndicatorProps extends React.ComponentProps<'nav'> {
  steps: Step[];
}

function StepIndicator({ steps, className, ...props }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className={className} {...props}>
      <ol className="flex items-center gap-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-2">
            {/* Step circle */}
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors',
                step.status === 'completed' && 'bg-primary text-primary-foreground',
                step.status === 'active' && 'border-2 border-primary text-primary',
                step.status === 'upcoming' &&
                  'border border-muted-foreground/30 text-muted-foreground'
              )}
              aria-current={step.status === 'active' ? 'step' : undefined}
            >
              {step.status === 'completed' ? <Check className="size-4" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-sm',
                step.status === 'active' && 'font-medium text-foreground',
                step.status === 'upcoming' && 'text-muted-foreground',
                step.status === 'completed' && 'text-foreground'
              )}
            >
              {step.label}
            </span>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={cn('h-px w-8', step.status === 'completed' ? 'bg-primary' : 'bg-muted')}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export { ProgressBar, StepIndicator };
export type { Step, StepStatus, ProgressBarProps, StepIndicatorProps };
