import { createRequire } from 'node:module';
import { fileURLToPath as _fileURLToPath } from 'node:url';
import { dirname as _dirname } from 'node:path';
const require = createRequire(import.meta.url);
const __filename = _fileURLToPath(import.meta.url);
const __dirname = _dirname(__filename);

const path = require('path');
const fs = require('fs');
import * as __req_0 from '../../platform/engine/engine';
const { createEngine } = __req_0;

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

const FLOWS_PATH = path.join(__dirname, '..', '..', 'platform', 'engine', 'flows.yaml');
const FLOWS_CONTENT = fs.readFileSync(FLOWS_PATH, 'utf-8');

describe('engine recovery safety (M0.2)', () => {
  it('records intent and applied transition events during advance', () => {
    const sessionPath = '/test/session-state.json';
    const eventsPath = '/test/transition-events.json';
    const store = createMockStore({ [FLOWS_PATH]: FLOWS_CONTENT });

    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });
    engine.advance();

    const events = JSON.parse(store._files[eventsPath]);
    expect(events).toHaveLength(2);
    expect(events[0].status).toBe('intent');
    expect(events[1].status).toBe('applied');
    expect(events[0].transition_id).toBe(events[1].transition_id);
  });

  it('replays state from applied transition events on restart', () => {
    const sessionPath = '/test/session-state.json';
    const eventsPath = '/test/transition-events.json';

    const events = [
      {
        transition_id: 't-1',
        from: 'IDLE',
        to: 'ONBOARDING',
        status: 'applied',
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      {
        transition_id: 't-2',
        from: 'ONBOARDING',
        to: 'PHASE_1',
        status: 'applied',
        timestamp: '2026-01-01T00:01:00.000Z',
      },
    ];

    const store = createMockStore({
      [FLOWS_PATH]: FLOWS_CONTENT,
      [sessionPath]: JSON.stringify({
        status: 'IDLE',
        mode: 'CREATE',
        transition_status: 'IN_PROGRESS',
        transition_target: 'ONBOARDING',
        transition_id: 't-1',
      }),
      [eventsPath]: JSON.stringify(events),
    });

    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });
    expect(engine.status().state).toBe('PHASE_1');
    expect(engine.status().history).toHaveLength(2);
  });

  it('blocks transition when another active owner holds lease', () => {
    const sessionPath = '/test/session-state.json';
    const leasePath = '/test/transition-lease.json';
    const store = createMockStore({
      [FLOWS_PATH]: FLOWS_CONTENT,
      [leasePath]: JSON.stringify({
        lease_id: 'existing',
        owner_id: 'worker-a',
        token: 'token-a',
        acquired_at: '2026-01-01T00:00:00.000Z',
        expires_at: '2999-01-01T00:00:00.000Z',
        state_from: 'IDLE',
        state_to: 'ONBOARDING',
      }),
    });

    const engine = createEngine({
      store,
      flowsPath: FLOWS_PATH,
      sessionPath,
      transitionLeaseOwnerId: 'worker-b',
    });

    expect(() => engine.advance()).toThrow('Transition lease acquisition failed');
  });
});
