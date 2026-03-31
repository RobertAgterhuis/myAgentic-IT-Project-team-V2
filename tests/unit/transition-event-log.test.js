import * as __req_0 from '../../platform/engine/transition-event-log';
const { appendTransitionEvent, readTransitionEvents, replayStateFromTransitionEvents } = __req_0;

function createMockStore(files = {}) {
  const _files = { ...files };
  return {
    exists: (fp) => fp in _files,
    readFile: (fp) => {
      if (!(fp in _files)) throw new Error(`File not found: ${fp}`);
      return _files[fp];
    },
    writeFile: (fp, data) => {
      _files[fp] = data;
    },
    mkdirp: () => {},
    _files,
  };
}

describe('transition-event-log', () => {
  it('appends events idempotently by transition_id + status', () => {
    const store = createMockStore();
    const logPath = '/test/transition-events.json';

    const first = appendTransitionEvent(store, logPath, {
      transition_id: 't-1',
      from: 'IDLE',
      to: 'ONBOARDING',
      status: 'intent',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    const duplicate = appendTransitionEvent(store, logPath, {
      transition_id: 't-1',
      from: 'IDLE',
      to: 'ONBOARDING',
      status: 'intent',
      timestamp: '2026-01-01T00:00:01.000Z',
    });

    expect(first.appended).toBe(true);
    expect(duplicate.appended).toBe(false);
    expect(readTransitionEvents(store, logPath)).toHaveLength(1);
  });

  it('replays deterministic state from applied events only', () => {
    const events = [
      {
        transition_id: 't-1',
        from: 'IDLE',
        to: 'ONBOARDING',
        status: 'intent',
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      {
        transition_id: 't-1',
        from: 'IDLE',
        to: 'ONBOARDING',
        status: 'applied',
        timestamp: '2026-01-01T00:00:02.000Z',
      },
      {
        transition_id: 't-1',
        from: 'IDLE',
        to: 'ONBOARDING',
        status: 'applied',
        timestamp: '2026-01-01T00:00:03.000Z',
      },
      {
        transition_id: 't-2',
        from: 'ONBOARDING',
        to: 'PHASE_1',
        status: 'applied',
        timestamp: '2026-01-01T00:00:04.000Z',
      },
      {
        transition_id: 't-3',
        from: 'PHASE_1',
        to: 'CRITIC_1',
        status: 'failed',
        timestamp: '2026-01-01T00:00:05.000Z',
      },
    ];

    const replay = replayStateFromTransitionEvents(events, 'IDLE');

    expect(replay.state).toBe('PHASE_1');
    expect(replay.history).toHaveLength(2);
    expect(replay.history[0]).toEqual({
      from: 'IDLE',
      to: 'ONBOARDING',
      timestamp: '2026-01-01T00:00:02.000Z',
    });
    expect(replay.history[1]).toEqual({
      from: 'ONBOARDING',
      to: 'PHASE_1',
      timestamp: '2026-01-01T00:00:04.000Z',
    });
  });

  it('does not move state for crash-mid-transition intent without applied', () => {
    const events = [
      {
        transition_id: 't-10',
        from: 'PHASE_2',
        to: 'CRITIC_2',
        status: 'intent',
        timestamp: '2026-01-01T00:00:00.000Z',
      },
    ];

    const replay = replayStateFromTransitionEvents(events, 'PHASE_2');
    expect(replay.state).toBe('PHASE_2');
    expect(replay.history).toEqual([]);
  });
});
