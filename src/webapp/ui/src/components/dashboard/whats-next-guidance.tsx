/**
 * "What's Next" contextual guidance — surfaces the most important next action
 * based on the current project state. M21-002.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heading, Text } from '@/components/ui/typography';
import { useSessions, useQuestionnaires, useDecisions } from '@/hooks';
import { useApprovals } from '@/hooks/use-governance';
import {
  Rocket,
  ClipboardList,
  Scale,
  ShieldCheck,
  Activity,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export interface GuidanceItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: { label: string; variant: 'error' | 'warning' | 'info' | 'secondary' };
  action: { label: string; href: string };
  priority: number; // lower = more important
}

export function WhatsNextGuidance() {
  const navigate = useNavigate();
  const { data: sessionsData } = useSessions();
  const { data: questionnairesData } = useQuestionnaires();
  const { data: decisionsData } = useDecisions();
  const { data: approvalsData } = useApprovals();

  const items = useMemo(() => {
    const guidance: GuidanceItem[] = [];

    const sessions = sessionsData?.sessions ?? [];
    const activeSession = sessions.find((s) => s.status === 'active');

    // No project at all → CTA to create
    if (sessions.length === 0) {
      guidance.push({
        id: 'create-project',
        icon: <Rocket className="size-5" />,
        title: 'Create your first project',
        description:
          'Start a CREATE or AUDIT command to begin your software development lifecycle.',
        action: { label: 'Go to Commands', href: '/commands' },
        priority: 0,
      });
      return guidance;
    }

    // Active session in onboarding → show progress
    if (activeSession && activeSession.phase === 'ONBOARDING') {
      guidance.push({
        id: 'complete-onboarding',
        icon: <Sparkles className="size-5" />,
        title: 'Complete onboarding',
        description: `Project "${activeSession.project}" is in the onboarding phase (${Math.round(activeSession.progress)}% complete).`,
        badge: { label: 'In Progress', variant: 'info' },
        action: {
          label: 'View Session',
          href: `/sessions/${encodeURIComponent(activeSession.id)}`,
        },
        priority: 1,
      });
    }

    // Pending questionnaires
    const questionnaires = questionnairesData?.questionnaires ?? [];
    const pendingQuestions = questionnaires.reduce((count, q) => {
      return count + q.questions.filter((question) => question.status === 'OPEN').length;
    }, 0);

    if (pendingQuestions > 0) {
      guidance.push({
        id: 'questionnaires',
        icon: <ClipboardList className="size-5" />,
        title: `${pendingQuestions} questionnaire${pendingQuestions === 1 ? '' : 's'} need your input`,
        description: 'Answer open questions to help agents proceed with their analysis.',
        badge: { label: String(pendingQuestions), variant: 'warning' },
        action: { label: 'Answer Questions', href: '/questionnaires' },
        priority: 2,
      });
    }

    // Open HIGH decisions
    const openDecisions = decisionsData?.open ?? [];
    const highDecisions = openDecisions.filter((d) => d.priority === 'HIGH');

    if (highDecisions.length > 0) {
      guidance.push({
        id: 'decisions-high',
        icon: <Scale className="size-5" />,
        title: `${highDecisions.length} critical decision${highDecisions.length === 1 ? '' : 's'} awaiting your input`,
        description: 'HIGH priority decisions may block phase progression.',
        badge: { label: String(highDecisions.length), variant: 'error' },
        action: { label: 'Review Decisions', href: '/decisions' },
        priority: 2,
      });
    }

    // Other open decisions (non-HIGH)
    const otherDecisions = openDecisions.filter((d) => d.priority !== 'HIGH');
    if (otherDecisions.length > 0) {
      guidance.push({
        id: 'decisions-other',
        icon: <Scale className="size-5" />,
        title: `${otherDecisions.length} open decision${otherDecisions.length === 1 ? '' : 's'}`,
        description: 'Review and resolve pending decisions.',
        badge: { label: String(otherDecisions.length), variant: 'warning' },
        action: { label: 'View Decisions', href: '/decisions' },
        priority: 4,
      });
    }

    // Pending approvals
    const pendingApprovals = approvalsData?.approvals?.filter((a) => a.status === 'pending') ?? [];

    if (pendingApprovals.length > 0) {
      guidance.push({
        id: 'approvals',
        icon: <ShieldCheck className="size-5" />,
        title: `${pendingApprovals.length} governance approval${pendingApprovals.length === 1 ? '' : 's'} needed`,
        description: 'Blocked items are waiting for your review and approval.',
        badge: { label: String(pendingApprovals.length), variant: 'error' },
        action: { label: 'Review Approvals', href: '/approvals' },
        priority: 1,
      });
    }

    // Active sprint progress
    if (activeSession && activeSession.phase.startsWith('PHASE-')) {
      const blockedStories = 0; // Would come from sprint data if available
      guidance.push({
        id: 'sprint-progress',
        icon: <Activity className="size-5" />,
        title: `Sprint active — ${activeSession.phase.replace('-', ' ')}`,
        description: `Project "${activeSession.project}" is ${Math.round(activeSession.progress)}% complete.${blockedStories > 0 ? ` ${blockedStories} blocked stories.` : ''}`,
        badge: { label: `${Math.round(activeSession.progress)}%`, variant: 'info' },
        action: { label: 'View Pipeline', href: '/pipeline' },
        priority: 3,
      });
    }

    return guidance.sort((a, b) => a.priority - b.priority);
  }, [sessionsData, questionnairesData, decisionsData, approvalsData]);

  if (items.length === 0) return null;

  return (
    <section aria-label="What's next" data-testid="whats-next-guidance">
      <Heading level={2} className="mb-3 text-sm">
        What&rsquo;s Next
      </Heading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <Card key={item.id} elevation="flat" className="p-4" data-testid={`guidance-${item.id}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-muted-foreground">{item.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold truncate">{item.title}</span>
                  {item.badge && (
                    <Badge variant={item.badge.variant} className="text-[10px] shrink-0">
                      {item.badge.label}
                    </Badge>
                  )}
                </div>
                <Text muted className="text-xs mb-2">
                  {item.description}
                </Text>
                <Button variant="ghost" size="xs" onClick={() => navigate(item.action.href)}>
                  {item.action.label} <ArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
