/**
 * ExecutionModeSelector — Interactive selector for SDLC_ONLY, AGENCY_ONLY, HYBRID modes
 * M4: Hybrid SDLC + Agency Execution Model
 */
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/typography';
import { CheckCircle, Users, GitBranch } from 'lucide-react';
import type { ExecutionMode } from '@/lib/execution-modes';
import { EXECUTION_MODE_DESCRIPTORS, getExecutionModeDescriptor } from '@/lib/execution-modes';

interface ExecutionModeSelectorProps {
  selectedMode?: ExecutionMode;
  onChange: (mode: ExecutionMode) => void;
  disabled?: boolean;
}

const ModeIcons = {
  CheckCircle,
  Users,
  GitBranch,
};

export function ExecutionModeSelector({
  selectedMode,
  onChange,
  disabled = false,
}: ExecutionModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Object.entries(EXECUTION_MODE_DESCRIPTORS).map(([mode, descriptor]) => {
          const isSelected = selectedMode === mode;
          const Icon = ModeIcons[descriptor.icon as keyof typeof ModeIcons];

          return (
            <button
              key={mode}
              onClick={() => !disabled && onChange(mode as ExecutionMode)}
              disabled={disabled}
              className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                isSelected
                  ? `border-${descriptor.color}-500 bg-${descriptor.color}-50 shadow-md`
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {Icon && (
                    <Icon className={`mt-1 h-5 w-5 text-${descriptor.color}-600 flex-shrink-0`} />
                  )}
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">{descriptor.label}</h3>
                    <p className="mt-1 text-sm text-gray-600">{descriptor.description}</p>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full bg-${descriptor.color}-600`} />
                    <span className="text-xs font-medium text-gray-700">Selected</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedMode && (
        <Card className="bg-blue-50 border-blue-200 p-4">
          <Text className="text-sm text-blue-900">
            <strong>{getExecutionModeDescriptor(selectedMode).label}:</strong>{' '}
            {getExecutionModeDescriptor(selectedMode).summary}
          </Text>
        </Card>
      )}
    </div>
  );
}
