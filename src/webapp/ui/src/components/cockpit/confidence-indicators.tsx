/**
 * ConfidenceIndicator — color-coded score badge with factor breakdown tooltip.
 * M27-004 / Operator confidence indicators
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import type { ConfidenceScore } from '@/lib/api-types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function scoreVariant(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 50) return 'bg-amber-100 dark:bg-amber-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

function scoreIcon(score: number) {
  if (score >= 80) return <TrendingUp className="size-4" />;
  if (score >= 50) return <Minus className="size-4" />;
  return <TrendingDown className="size-4" />;
}

/* ── Single confidence badge (compact) ── */

interface ConfidenceBadgeProps {
  score: ConfidenceScore;
  className?: string;
}

export function ConfidenceBadge({ score, className }: ConfidenceBadgeProps) {
  return (
    <Badge variant={scoreVariant(score.score)} className={`text-xs ${className ?? ''}`}>
      {score.label}: {score.score}%
    </Badge>
  );
}

/* ── Confidence card with factor breakdown ── */

interface ConfidenceCardProps {
  score: ConfidenceScore;
  className?: string;
}

export function ConfidenceCard({ score, className }: ConfidenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const variant = scoreVariant(score.score);

  return (
    <Card
      elevation="raised"
      tone={variant === 'success' ? 'success' : variant === 'warning' ? 'warning' : 'error'}
      className={`cursor-pointer overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${className ?? ''}`}
      onClick={() => setExpanded(!expanded)}
      role="button"
      aria-expanded={expanded}
      aria-label={`${score.label}: ${score.score}%`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
          Confidence signal
        </Badge>
        {score.score < 80 ? (
          <ControlSignalBadge signal="needs-human-input" />
        ) : (
          <ControlSignalBadge signal="governed" />
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-2xl border border-border/60 p-2 ${scoreBg(score.score)}`}>
            <span className={scoreColor(score.score)}>{scoreIcon(score.score)}</span>
          </div>
          <div>
            <p className="text-sm font-medium">{score.label}</p>
            <p className="text-[10px] text-muted-foreground">
              {score.factors.length} contributing factors
            </p>
          </div>
        </div>
        <span className={`text-2xl font-bold ${scoreColor(score.score)}`}>{score.score}%</span>
      </div>

      {/* Factor breakdown */}
      {expanded && (
        <div className="mt-4 space-y-3 rounded-2xl border border-border/60 bg-background/62 p-3">
          {score.factors.map((factor, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{factor.label}</span>
                <span className={scoreColor(factor.value)}>{factor.value}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    factor.value >= 80
                      ? 'bg-green-500'
                      : factor.value >= 50
                        ? 'bg-amber-400'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${factor.value}%` }}
                />
              </div>
              <p className="text-[9px] text-muted-foreground">Weight: {factor.weight}×</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── Confidence dashboard panel (all 3 scores) ── */

interface ConfidencePanelProps {
  sessionHealth: ConfidenceScore;
  sprintReadiness: ConfidenceScore;
  agentConfidence: ConfidenceScore;
  className?: string;
}

export function ConfidencePanel({
  sessionHealth,
  sprintReadiness,
  agentConfidence,
  className,
}: ConfidencePanelProps) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className ?? ''}`}
      data-testid="confidence-panel"
    >
      <ConfidenceCard score={sessionHealth} />
      <ConfidenceCard score={sprintReadiness} />
      <ConfidenceCard score={agentConfidence} />
    </div>
  );
}
