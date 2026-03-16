/**
 * Tests: SessionTracker — session lifecycle, timeline events, agent tracking
 * M15 / Issues #M15-021, #M15-023
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SessionTracker } from '../../src/webapp/session-tracker';

describe('SessionTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new SessionTracker();
  });

  describe('session lifecycle', () => {
    it('generates a unique session ID', () => {
      const session = tracker.startSession('project-a', 'CREATE');
      expect(session.id).toMatch(/^sess-/);
      expect(session.project).toBe('project-a');
      expect(session.flow).toBe('CREATE');
      expect(session.status).toBe('active');
      expect(session.progress).toBe(0);
      expect(session.completed_at).toBeNull();
    });

    it('lists sessions newest first', () => {
      const s1 = tracker.startSession('p1', 'CREATE');
      const s2 = tracker.startSession('p2', 'AUDIT');
      const list = tracker.listSessions();
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe(s2.id);
      expect(list[1].id).toBe(s1.id);
    });

    it('gets a session by ID', () => {
      const session = tracker.startSession('p1', 'CREATE');
      expect(tracker.getSession(session.id)).toBeDefined();
      expect(tracker.getSession('nonexistent')).toBeUndefined();
    });

    it('updates session state', () => {
      const session = tracker.startSession('p1', 'CREATE');
      tracker.updateSession(session.id, { phase: 'PHASE-2', progress: 50 });
      const updated = tracker.getSession(session.id);
      expect(updated.phase).toBe('PHASE-2');
      expect(updated.progress).toBe(50);
    });

    it('completes a session', () => {
      const session = tracker.startSession('p1', 'CREATE');
      tracker.completeSession(session.id, 'completed');
      const completed = tracker.getSession(session.id);
      expect(completed.status).toBe('completed');
      expect(completed.completed_at).not.toBeNull();
    });

    it('marks failed session', () => {
      const session = tracker.startSession('p1', 'CREATE');
      tracker.completeSession(session.id, 'failed');
      const failed = tracker.getSession(session.id);
      expect(failed.status).toBe('failed');
      expect(failed.completed_at).not.toBeNull();
    });

    it('evicts oldest sessions when over limit', () => {
      // Start 101 sessions (max is 100)
      for (let i = 0; i < 101; i++) {
        tracker.startSession(`p${i}`, 'CREATE');
      }
      expect(tracker.listSessions()).toHaveLength(100);
    });
  });

  describe('timeline events', () => {
    it('adds and retrieves timeline events', () => {
      const session = tracker.startSession('p1', 'CREATE');
      tracker.addTimelineEvent(session.id, {
        type: 'phase_start',
        description: 'Phase 1 started',
        phase: 'PHASE-1',
      });
      const timeline = tracker.getTimeline(session.id);
      // session_start + phase_start
      expect(timeline).toHaveLength(2);
      expect(timeline[1].type).toBe('phase_start');
      expect(timeline[1].description).toBe('Phase 1 started');
      expect(timeline[1].phase).toBe('PHASE-1');
      expect(timeline[1].id).toMatch(/^evt-/);
      expect(timeline[1].timestamp).toBeDefined();
    });

    it('returns empty array for unknown session', () => {
      expect(tracker.getTimeline('nonexistent')).toEqual([]);
    });

    it('auto-adds session_start event on startSession', () => {
      const session = tracker.startSession('p1', 'CREATE');
      const timeline = tracker.getTimeline(session.id);
      expect(timeline).toHaveLength(1);
      expect(timeline[0].type).toBe('session_start');
    });

    it('enforces ring buffer limit', () => {
      const session = tracker.startSession('p1', 'CREATE');
      // Add 1001 events (1 from session_start + 1000 more)
      for (let i = 0; i < 1001; i++) {
        tracker.addTimelineEvent(session.id, {
          type: 'agent_start',
          description: `Event ${i}`,
        });
      }
      // Max is 1000
      expect(tracker.getTimeline(session.id).length).toBeLessThanOrEqual(1000);
    });
  });

  describe('agent tracking', () => {
    it('starts and retrieves agent', () => {
      const session = tracker.startSession('p1', 'CREATE');
      const agent = tracker.startAgent(
        session.id,
        'agent-01',
        'Business Analyst',
        'PHASE-1',
        'Analyze business reqs'
      );
      expect(agent.id).toBe('agent-01');
      expect(agent.name).toBe('Business Analyst');
      expect(agent.status).toBe('running');
      expect(agent.task_description).toBe('Analyze business reqs');
      expect(agent.retry_count).toBe(0);
      expect(agent.session_id).toBe(session.id);
    });

    it('completes an agent', () => {
      const session = tracker.startSession('p1', 'CREATE');
      tracker.startAgent(session.id, 'agent-01', 'BA', 'P1', 'task');
      const completed = tracker.completeAgent('agent-01', ['output1.md']);
      expect(completed.status).toBe('completed');
      expect(completed.duration_ms).toBeGreaterThanOrEqual(0);
      expect(completed.outputs).toEqual(['output1.md']);
    });

    it('fails an agent', () => {
      const session = tracker.startSession('p1', 'CREATE');
      tracker.startAgent(session.id, 'agent-01', 'BA', 'P1', 'task');
      const failed = tracker.failAgent('agent-01');
      expect(failed.status).toBe('failed');
    });

    it('retries an agent', () => {
      const session = tracker.startSession('p1', 'CREATE');
      tracker.startAgent(session.id, 'agent-01', 'BA', 'P1', 'task');
      tracker.retryAgent('agent-01');
      const agent = tracker.getAgent('agent-01');
      expect(agent.status).toBe('retrying');
      expect(agent.retry_count).toBe(1);
    });

    it('lists agents by session', () => {
      const s1 = tracker.startSession('p1', 'CREATE');
      const s2 = tracker.startSession('p2', 'AUDIT');
      tracker.startAgent(s1.id, 'a1', 'BA', 'P1', 'task1');
      tracker.startAgent(s2.id, 'a2', 'SA', 'P2', 'task2');
      expect(tracker.listAgentsBySession(s1.id)).toHaveLength(1);
      expect(tracker.listAgentsBySession(s1.id)[0].id).toBe('a1');
    });

    it('returns undefined for unknown agent', () => {
      expect(tracker.getAgent('nonexistent')).toBeUndefined();
      expect(tracker.completeAgent('nonexistent')).toBeUndefined();
      expect(tracker.failAgent('nonexistent')).toBeUndefined();
      expect(tracker.retryAgent('nonexistent')).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('clears all data', () => {
      const session = tracker.startSession('p1', 'CREATE');
      tracker.startAgent(session.id, 'a1', 'BA', 'P1', 'task');
      tracker.reset();
      expect(tracker.listSessions()).toHaveLength(0);
      expect(tracker.listAgents()).toHaveLength(0);
    });
  });
});
