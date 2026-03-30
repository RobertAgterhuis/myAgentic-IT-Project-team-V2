/**
 * MilestoneProgress — Display milestone progression and status
 * M4: Hybrid SDLC + Agency Execution Model
 */
import { Card } from '@/components/ui/card';
import { Heading, Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock } from 'lucide-react';
import { getAllMilestones, getMilestoneProgress } from '@/lib/execution-modes';

export function MilestoneProgress() {
  const milestones = getAllMilestones();
  const progress = getMilestoneProgress();

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
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
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
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              ) : (
                <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
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
                    className="ml-2 flex-shrink-0"
                  >
                    {milestone.status === 'completed' ? 'Complete' : 'In Progress'}
                  </Badge>
                </div>

                {milestone.progress < 100 && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${milestone.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
