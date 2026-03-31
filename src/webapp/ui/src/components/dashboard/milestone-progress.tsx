/**
 * MilestoneProgress — Display milestone progression and status
 * M4: Hybrid SDLC + Agency Execution Model
 */
import { Card } from '@/components/ui/card';
import { Heading, Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress';
import { CheckCircle, Clock } from 'lucide-react';
import { useMilestones } from '@/hooks';
import { getAllMilestones } from '@/lib/execution-modes';

export function MilestoneProgress() {
  const staticMilestones = getAllMilestones();
  const { data: liveMilestones } = useMilestones(false);

  const milestones =
    liveMilestones && liveMilestones.length > 0
      ? liveMilestones
          .map((milestone) => {
            const idMatch = milestone.name.match(/\bM\d+\b/i);
            const id = idMatch ? idMatch[0].toUpperCase() : milestone.name.split(':')[0]?.trim();
            const staticDef = staticMilestones.find((item) => item.id === id);
            const isComplete = milestone.status === 'complete' || milestone.progress >= 100;

            return {
              id: id || milestone.id,
              name:
                milestone.name.replace(/^\s*M\d+\s*:\s*/i, '') || staticDef?.name || milestone.name,
              description:
                staticDef?.description ||
                `Status: ${milestone.status}, target completion ${milestone.completion}`,
              status: isComplete ? ('completed' as const) : ('in-progress' as const),
              progress: milestone.progress,
            };
          })
          .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }))
      : staticMilestones;

  const completed = milestones.filter((m) => m.status === 'completed').length;
  const inProgress = milestones.filter((m) => m.status === 'in-progress').length;
  const progress = {
    total: milestones.length,
    completed,
    inProgress,
    percentage: milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0,
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header with progress bar */}
        <div>
          <div className="flex items-center justify-between">
            <Heading level={3}>Milestone Progress</Heading>
            <Badge variant="info">
              {progress.completed}/{progress.total} Complete
            </Badge>
          </div>

          {/* Progress bar */}
          <ProgressBar value={progress.percentage} className="mt-4" />
          <Text className="mt-2 text-sm text-gray-600">
            {progress.percentage}% Complete • {progress.inProgress} In Progress
          </Text>
        </div>

        {/* Milestone list */}
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-start gap-4 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
            >
              {milestone.status === 'completed' ? (
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
              )}

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {milestone.id}: {milestone.name}
                    </h4>
                    <Text className="mt-0.5 text-sm text-gray-600">{milestone.description}</Text>
                  </div>
                  <Badge
                    variant={milestone.status === 'completed' ? 'success' : 'info'}
                    className="ml-2 shrink-0"
                  >
                    {milestone.status === 'completed' ? 'Complete' : 'In Progress'}
                  </Badge>
                </div>

                {milestone.progress < 100 && (
                  <ProgressBar value={milestone.progress} className="mt-2" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
