import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DecisionProvenanceView } from './decision-provenance-view';

describe('DecisionProvenanceView', () => {
  it('renders feedback propagation markers for human interventions', () => {
    render(
      <DecisionProvenanceView
        items={[
          {
            id: 'prov-1',
            decision_type: 'human_override',
            actor_type: 'human',
            actor: 'qa-user',
            action: 'pause',
            rationale: 'Need manual validation before continuing',
            source: 'orchestrator-control',
            state: 'PHASE_2',
            mode: 'CREATE',
            timestamp: '2026-03-20T10:00:00.000Z',
            feedback_propagation: {
              status: 'observed',
              impacted_event_count: 2,
              downstream_event_types: ['gate_failure', 'error'],
              latest_timestamp: '2026-03-20T10:20:00.000Z',
              summary: 'Observed 2 downstream machine events after this intervention.',
            },
          },
        ]}
      />
    );

    expect(screen.getByText(/feedback propagation/i)).toBeInTheDocument();
    expect(screen.getByText(/observed 2 downstream machine events/i)).toBeInTheDocument();
    expect(screen.getByText(/markers: gate_failure, error/i)).toBeInTheDocument();
  });
});
