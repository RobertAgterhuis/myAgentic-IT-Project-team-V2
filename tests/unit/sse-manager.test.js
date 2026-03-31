import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as __req_0 from '../../src/webapp/sse-manager';
const { createSSEManager } = __req_0;
const EventEmitter = require('events');

function mockReq() {
  return new EventEmitter();
}

function mockRes() {
  const res = new EventEmitter();
  res.written = [];
  res.write = vi.fn((data) => res.written.push(data));
  return res;
}

describe('createSSEManager', () => {
  let mgr;

  afterEach(() => {
    if (mgr) mgr.destroy();
  });

  it('adds a client and reports size', () => {
    mgr = createSSEManager();
    const ok = mgr.addClient(mockReq(), mockRes());
    expect(ok).toBe(true);
    expect(mgr.size).toBe(1);
  });

  it('rejects clients beyond maxClients', () => {
    mgr = createSSEManager({ maxClients: 1 });
    mgr.addClient(mockReq(), mockRes());
    const ok = mgr.addClient(mockReq(), mockRes());
    expect(ok).toBe(false);
    expect(mgr.size).toBe(1);
  });

  it('broadcasts events to all connected clients', () => {
    mgr = createSSEManager();
    const r1 = mockRes();
    const r2 = mockRes();
    mgr.addClient(mockReq(), r1);
    mgr.addClient(mockReq(), r2);

    mgr.broadcast('test_event', { key: 'value' });

    expect(r1.write).toHaveBeenCalledWith(expect.stringContaining('event: test_event'));
    expect(r2.write).toHaveBeenCalledWith(expect.stringContaining('"key":"value"'));
  });

  it('removes client on disconnect (req close)', () => {
    mgr = createSSEManager();
    const req = mockReq();
    const res = mockRes();
    mgr.addClient(req, res);
    expect(mgr.size).toBe(1);

    req.emit('close');
    expect(mgr.size).toBe(0);
  });

  it('removes client on write error during broadcast', () => {
    mgr = createSSEManager();
    const req = mockReq();
    const res = mockRes();
    res.write = vi.fn(() => {
      throw new Error('broken pipe');
    });
    mgr.addClient(req, res);
    expect(mgr.size).toBe(1);

    mgr.broadcast('ping', {});
    expect(mgr.size).toBe(0);
  });

  it('destroy clears all clients and timers', () => {
    mgr = createSSEManager();
    mgr.addClient(mockReq(), mockRes());
    mgr.addClient(mockReq(), mockRes());
    expect(mgr.size).toBe(2);

    mgr.destroy();
    expect(mgr.size).toBe(0);
    mgr = null;
  });
});
