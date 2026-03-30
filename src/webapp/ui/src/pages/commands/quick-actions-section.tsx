/**
 * Quick Actions section for the Commands page.
 * P1-UI-E1-I1 — Decompose monolithic operational pages
 */
import { Heading, Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { OrchestratorCommandName } from '@/lib/api-types';
import type { QuickActionConfig } from './commands-config';

interface QuickActionsProps {
  actions: QuickActionConfig[];
  recommendedCommand: OrchestratorCommandName;
  onAction: (command: OrchestratorCommandName) => void;
}

export function QuickActionsSection({ actions, recommendedCommand, onAction }: QuickActionsProps) {
  return (
    <div>
      <Heading level={2} className="mb-3">
        Quick Actions
      </Heading>
      <Text muted className="mb-3 text-sm">
        Use a quick action when you already know the type of work. Each card explains when to use it
        and what starts immediately after.
      </Text>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => (
          <Card
            key={action.command}
            clickable
            onClick={() => onAction(action.command)}
            elevation="outlined"
            className={cn(
              'px-4 py-4 text-left transition-colors',
              recommendedCommand === action.command && 'border-info/40 bg-info/5'
            )}
          >
            <div className="flex flex-col gap-3 py-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {action.icon}
                  <span className="font-semibold text-sm">{action.label}</span>
                </div>
                {recommendedCommand === action.command && <Badge variant="info">Suggested</Badge>}
              </div>
              <Text muted className="text-xs">
                {action.description}
              </Text>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium text-foreground">Use when:</span>{' '}
                  <span className="text-muted-foreground">{action.whenToUse}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Next:</span>{' '}
                  <span className="text-muted-foreground">{action.nextStep}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
