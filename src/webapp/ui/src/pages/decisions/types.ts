import type { OpenDecision, DecidedDecision, DeferredDecision } from '@/lib/api-types';

export type DecisionItem =
  | (OpenDecision & { _kind: 'open' })
  | (DecidedDecision & { _kind: 'decided' })
  | (DeferredDecision & { _kind: 'deferred' });

export type StatusFilter = 'all' | 'open' | 'decided' | 'deferred';
