import type { DecisionItem } from './types';

export function getDecisionSubject(item: DecisionItem): string {
  if (item._kind === 'open') return item.question;
  if (item._kind === 'decided') return item.decision;
  return item.subject;
}
