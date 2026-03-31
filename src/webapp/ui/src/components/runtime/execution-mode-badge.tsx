/**
 * ExecutionModeBadge — Display execution mode as a visual badge
 * M4: Hybrid SDLC + Agency Execution Model
 */
import type { ExecutionMode } from '@/lib/execution-modes';
import { getExecutionModeDescriptor } from '@/lib/execution-modes';
import { CheckCircle, Users, GitBranch } from 'lucide-react';

interface ExecutionModeBadgeProps {
  mode: ExecutionMode;
  detailed?: boolean;
}

const ModeIcons = {
  CheckCircle,
  Users,
  GitBranch,
};

export function ExecutionModeBadge({ mode, detailed = false }: ExecutionModeBadgeProps) {
  const descriptor = getExecutionModeDescriptor(mode);
  const Icon = ModeIcons[descriptor.icon as keyof typeof ModeIcons];

  const colorMap = {
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${colorMap[descriptor.color as keyof typeof colorMap]} border`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span className="text-sm font-medium">{descriptor.label}</span>
      {detailed && <span className="text-xs opacity-75">• {descriptor.description}</span>}
    </div>
  );
}
