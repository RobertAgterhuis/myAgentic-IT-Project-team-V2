'use strict';

const { TransitionLeaseManager } = require('../../platform/engine/transition-lease');

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

describe('TransitionLeaseManager', () => {
  it('acquires and releases lease for owner', () => {
    const store = createMockStore();
    const manager = new TransitionLeaseManager(store, '/test/transition-lease.json');

    const acquired = manager.acquire({
      ownerId: 'worker-a',
      from: 'IDLE',
      to: 'ONBOARDING',
      ttlMs: 10_000,
      now: 1000,
    });

    expect(acquired.acquired).toBe(true);
    expect(typeof acquired.token).toBe('string');

    const released = manager.release('worker-a', acquired.token);
    expect(released).toBe(true);
  });

  it('prevents split-brain while lease is active', () => {
    const store = createMockStore();
    const manager = new TransitionLeaseManager(store, '/test/transition-lease.json');

    const first = manager.acquire({
      ownerId: 'worker-a',
      from: 'PHASE_1',
      to: 'CRITIC_1',
      ttlMs: 10_000,
      now: 2000,
    });
    expect(first.acquired).toBe(true);

    const second = manager.acquire({
      ownerId: 'worker-b',
      from: 'PHASE_1',
      to: 'CRITIC_1',
      ttlMs: 10_000,
      now: 2500,
    });

    expect(second.acquired).toBe(false);
    expect(second.reason).toBe('owned-by-other');
    expect(second.ownerId).toBe('worker-a');
  });

  it('allows takeover after lease expiry', () => {
    const store = createMockStore();
    const manager = new TransitionLeaseManager(store, '/test/transition-lease.json');

    const first = manager.acquire({
      ownerId: 'worker-a',
      from: 'PHASE_2',
      to: 'CRITIC_2',
      ttlMs: 1000,
      now: 1000,
    });
    expect(first.acquired).toBe(true);

    const takeover = manager.acquire({
      ownerId: 'worker-b',
      from: 'PHASE_2',
      to: 'CRITIC_2',
      ttlMs: 1000,
      now: 2501,
    });

    expect(takeover.acquired).toBe(true);
    expect(takeover.ownerId).toBe('worker-b');
  });
});
