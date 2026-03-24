/**
 * Project Brief input section for the Commands page.
 * P1-UI-E1-I1 — Decompose monolithic operational pages
 */
import { Text } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { InputField } from '@/components/ui/input-field';
import { Terminal, Send, ArrowRight } from 'lucide-react';

interface ProjectBriefSectionProps {
  projectName: string;
  setProjectName: (value: string) => void;
  briefText: string;
  setBriefText: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ProjectBriefSection({
  projectName,
  setProjectName,
  briefText,
  setBriefText,
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

        <div className="space-y-1.5">
          <label htmlFor="brief-input" className="text-sm font-medium">
            Brief description
          </label>
          <textarea
            id="brief-input"
            className="flex min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            placeholder="Describe the desired outcome, current problem, or scope you want the agent team to handle…"
            value={briefText}
            onChange={(e) => setBriefText(e.target.value)}
          />
          <Text muted className="text-sm">
            Good brief example: "Audit our current SDLC workflow and identify blockers for faster
            feature delivery."
          </Text>
        </div>

        <div className="rounded-2xl border border-info/30 bg-info/10 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <ArrowRight className="size-4 text-info" /> What happens when you click Submit Brief
          </div>
          <Text muted className="mt-1 text-sm">
            A CREATE command is queued with your project name and brief. The orchestrator then
            starts onboarding and the first analysis phase.
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
