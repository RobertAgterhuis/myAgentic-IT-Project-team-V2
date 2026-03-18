import * as React from 'react';
import { Card } from './card';
import { Badge } from './badge';
import { Text, Heading } from './typography';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface HeroMetric {
  label: string;
  value: string;
  detail?: string;
}

interface MissionControlHeroProps extends React.ComponentProps<'section'> {
  eyebrow?: string;
  title: string;
  description: string;
  badges?: React.ReactNode;
  metrics?: HeroMetric[];
  motifs?: React.ReactNode;
  asideTitle?: string;
  asideDescription?: string;
  asideContent?: React.ReactNode;
}

export function MissionControlHero({
  eyebrow = 'Mission control',
  title,
  description,
  badges,
  metrics = [],
  motifs,
  asideTitle,
  asideDescription,
  asideContent,
  className,
  ...props
}: MissionControlHeroProps) {
  return (
    <section className={cn('relative', className)} {...props}>
      <Card
        elevation="raised"
        tone="info"
        className="overflow-hidden border border-info/20 px-6 py-6 lg:px-7"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-info)_18%,transparent)_0%,transparent_34%),radial-gradient(circle_at_bottom_right,color-mix(in_srgb,var(--color-secondary)_16%,transparent)_0%,transparent_32%)]"
        />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,0.9fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-info/20 bg-background/70 text-foreground">
                <Sparkles className="size-3.5" />
                {eyebrow}
              </Badge>
              {badges}
            </div>

            <div className="space-y-2">
              <Heading
                level={1}
                className="max-w-4xl text-balance text-4xl leading-tight lg:text-5xl"
              >
                {title}
              </Heading>
              <Text muted className="max-w-3xl text-sm leading-6 lg:text-base">
                {description}
              </Text>
            </div>

            {metrics.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-border/60 bg-background/72 px-4 py-4 shadow-sm backdrop-blur-sm"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {metric.label}
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {metric.value}
                    </div>
                    {metric.detail && (
                      <div className="mt-1 text-xs text-muted-foreground">{metric.detail}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {motifs && <div className="grid gap-3 md:grid-cols-3">{motifs}</div>}
          </div>

          {(asideTitle || asideDescription || asideContent) && (
            <div className="rounded-[28px] border border-border/70 bg-card/78 p-5 shadow-md backdrop-blur-sm">
              {asideTitle && (
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {asideTitle}
                </div>
              )}
              {asideDescription && (
                <Text muted className="mt-3 text-sm leading-6">
                  {asideDescription}
                </Text>
              )}
              {asideContent && <div className="mt-4">{asideContent}</div>}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}

export type { HeroMetric, MissionControlHeroProps };
