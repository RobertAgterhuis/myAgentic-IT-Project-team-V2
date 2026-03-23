import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { InputField } from '@/components/ui/input-field';
import { FormRow } from '@/components/ui/form-row';
import { useCreateDecision } from '@/hooks';
import type { DecisionPriority } from '@/lib/api-types';
import { RelatedDecisionsPanel } from './related-decisions-panel';

export function CreateDecisionDialog({
  open,
  onOpenChange,
  onOpenDecision,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDecision?: (decisionId: string) => void;
}) {
  const create = useCreateDecision();
  const [scope, setScope] = useState('');
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<DecisionPriority>('MEDIUM');

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return;
    create.mutate(
      { action: 'create', type: 'OPEN_QUESTION', priority, scope: scope.trim(), text: text.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          setScope('');
          setText('');
        },
      }
    );
  }, [create, text, scope, priority, onOpenChange]);

  return (
    <ModalDialog
      title="New Decision"
      open={open}
      onOpenChange={onOpenChange}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || create.isPending}
            loading={create.isPending}
          >
            Create
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <InputField
          label="Question / Decision"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be decided?"
        />
        <InputField
          label="Scope"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder="e.g., architecture, ux, business"
        />
        <FormRow label="Priority">
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            aria-label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as DecisionPriority)}
          >
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </FormRow>

        <RelatedDecisionsPanel
          query={text}
          onOpenDecision={onOpenDecision}
          emptyHint="Start typing a decision or question to retrieve similar past decisions."
          testId="related-decisions-panel-create"
        />
      </div>
    </ModalDialog>
  );
}
