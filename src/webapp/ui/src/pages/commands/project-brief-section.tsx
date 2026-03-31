/**
 * Project Brief input section for the Commands page.
 * P1-UI-E1-I1 — Decompose monolithic operational pages
 */
import { Text } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { InputField } from '@/components/ui/input-field';
import { FieldGroup } from '@/components/ui/field-group';
import { TextareaField } from '@/components/ui/textarea-field';
import { ExecutionModeSelector } from '@/components/runtime/execution-mode-selector';
import type { ExecutionMode } from '@/lib/execution-modes';
import { Terminal, Send, ArrowRight } from 'lucide-react';

interface ProjectBriefSectionProps {
  projectName: string;
  setProjectName: (value: string) => void;
  briefText: string;
  setBriefText: (value: string) => void;
  selectedExecutionMode: ExecutionMode;
  setSelectedExecutionMode: (mode: ExecutionMode) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ProjectBriefSection({
  projectName,
  setProjectName,
  briefText,
  setBriefText,
  selectedExecutionMode,
  setSelectedExecutionMode,
  onSubmit,
  isSubmitting,
}: ProjectBriefSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Terminal className="size-5" />
          <span className="font-semibold">Project Brief</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <InputField
          label="Project name"
          placeholder="e.g., My SaaS Platform"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          helperText="Use the product, initiative, or feature name you want to see in the queue and pipeline."
        />

        <FieldGroup
          title="Execution brief"
          description="Write the goal and scope so the orchestrator starts with explicit context."
        >
          <TextareaField
            id="brief-input"
            label="Brief description"
            placeholder="Describe the desired outcome, current problem, or scope you want the agent team to handle…"
            value={briefText}
            onChange={(e) => setBriefText(e.target.value)}
            helperText='Good brief example: "Audit our current SDLC workflow and identify blockers for faster feature delivery."'
            showCount
            maxLength={1200}
            rows={6}
          />
        </FieldGroup>

        <FieldGroup
          title="Execution mode"
          description="Choose how the orchestrator should run this brief: SDLC only, agency only, or hybrid."
        >
          <ExecutionModeSelector
            selectedMode={selectedExecutionMode}
            onChange={setSelectedExecutionMode}
            disabled={isSubmitting}
          />
        </FieldGroup>

        <div className="rounded-2xl border border-info/30 bg-info/10 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <ArrowRight className="size-4 text-info" /> What happens when you click Submit Brief
          </div>
          <Text muted className="mt-1 text-sm">
            The selected execution mode is queued with your project brief. HYBRID starts the SDLC
            flow with agency specialist injections; AGENCY ONLY runs pure agency execution; SDLC
            ONLY runs the standard SDLC cycle.
          </Text>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={onSubmit}
            disabled={!projectName.trim() || !briefText.trim() || isSubmitting}
            loading={isSubmitting}
          >
            <Send className="size-4 mr-2" />
            Submit Brief
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
